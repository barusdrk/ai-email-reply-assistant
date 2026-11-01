import {Types} from "mongoose";
import {draftRepository} from "../repositories/DraftRepository.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {sendEmail} from "./sendEmail.js";
import {notify} from "./notification.js";
import {audit} from "./audit.js";
import {recordDraftAnalytics} from "./supportAnalytics.js";
import {getSettings} from "./settings.js";

export interface AutomaticSendResult {
  sent:boolean;
  provider:"gmail"|"outlook";
  draftId:string;
  emailId:string;
  sentAt:Date;
}

type EmailProvider="gmail"|"outlook";

function getCustomerEmail(email:{senderEmail?:string}|null,draft:{customer?:string}):string {
  return String(email?.senderEmail??draft.customer??"").trim();
}

function getErrorMessage(error:unknown):string {
  return error instanceof Error?error.message:"Automatic email sending failed.";
}

function isAmbiguousSendError(error:unknown):boolean {
  const message=getErrorMessage(error).toLowerCase();
  return ["timeout","timed out","network","socket","connection","econnreset","econnrefused","etimedout","provider response","unknown response"].some(part=>message.includes(part));
}

async function bestEffort(operation:string,action:()=>Promise<unknown>):Promise<void> {
  try {
    await action();
  } catch(error) {
    console.error(`${operation} failed:`,error);
  }
}

async function markAutomaticRecoveryRequired(
  draftId:string,
  userId:string,
  message:string,
  details:Record<string,unknown>,
  expectedStartedAt:Date,
):Promise<boolean> {
  if(!(expectedStartedAt instanceof Date)||Number.isNaN(expectedStartedAt.getTime())) {
    throw new Error("Cannot recover automatic send without a valid send-start timestamp.");
  }

  let recoveryDraft;
  try {
    recoveryDraft=await draftRepository.markAutomaticRecoveryRequired(draftId,message,expectedStartedAt);
  } catch(error) {
    console.error("CRITICAL: Could not persist automatic-send recovery state:",{draftId,error:getErrorMessage(error),details});
    throw error;
  }

  if(!recoveryDraft) {
    const currentDraft=await draftRepository.findById(draftId).catch(()=>null);
    if(currentDraft?.status==="sent")return true;
    throw new Error("Recovery persistence failed: the draft recovery state was not updated.");
  }

  await bestEffort("Automatic-send recovery audit",()=>audit(
    "automatic_send_recovery_required","draft",draftId,userId,details,
  ));
  await bestEffort("Automatic-send recovery notification",()=>notify(
    userId,"approval","Automatic reply requires verification",
    "The reply may have reached the email provider. Check the provider's Sent folder before taking any further action.",
    draftId,
  ));
  return true;
}

async function releaseBeforeProvider(
  draftId:string,
  userId:string,
  message:string,
  details:Record<string,unknown>,
):Promise<boolean> {
  try {
    const currentDraft=await draftRepository.findById(draftId);
    if(!currentDraft)return false;
    if(String(currentDraft.userId)!==userId)return false;
    if(currentDraft.status==="sent")return true;
    if(currentDraft.automaticSendRecoveryRequired)return false;

    const phase=currentDraft.automaticSendPhase;
    const claimedAt=currentDraft.automaticSendClaimedAt;

    if((phase!=="claimed"&&phase!=="sending")||!claimedAt||Number.isNaN(claimedAt.getTime())) {
      console.error("Cannot safely release automatic-send claim:",{draftId,phase});
      return false;
    }

    const releasedDraft=await draftRepository.releaseAutomaticClaim(draftId,message,phase,claimedAt);
    if(releasedDraft)return true;

    console.error("Automatic-send claim changed before release:",{draftId,phase});
    return false;
  } catch(error) {
    console.error("Automatic-send claim release failed before provider call:",{
      draftId,error:getErrorMessage(error),details,
    });
    return false;
  }
}

async function recordAutomaticSendAnalytics(userId:string,draftId:string):Promise<void> {
  try {
    const draft=await draftRepository.findById(draftId);
    if(!draft)return;

    const policyIssues=Array.isArray(draft.supportPolicyIssues)?draft.supportPolicyIssues:[];

    await recordDraftAnalytics({
      userId,
      emailId:draft.emailId.toString(),
      draftId,
      provider:draft.provider,
      category:draft.supportCategory,
      confidenceScore:draft.confidence?.score??null,
      confidenceLevel:draft.confidence?.level??null,
      policyCompliant:policyIssues.length===0,
      policyViolationCount:policyIssues.length,
      automaticAction:draft.automaticAction,
      supportDecision:draft.supportDecision,
      supportNeedsHuman:draft.supportNeedsHuman,
      outcome:"auto_sent",
    });
  } catch(error) {
    console.error("Automatic-send analytics recording failed:",error);
  }
}

export async function sendAutomatically(
  userId:string,
  draftId:string,
):Promise<AutomaticSendResult|null> {
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  if(!Types.ObjectId.isValid(draftId))throw new Error("Invalid draft ID.");

  const existingDraft=await draftRepository.findById(draftId);
  if(!existingDraft)return null;
  if(String(existingDraft.userId)!==userId)throw new Error("Unauthorized.");
  if(existingDraft.status==="sent")throw new Error("Draft has already been sent.");
  const settings=await getSettings(userId);
  if(settings.autoSendEnabled!==true)throw new Error("Automatic sending is disabled in your AI settings.");
  if(existingDraft.automaticSendRecoveryRequired) {
    throw new Error("This draft requires human verification before another automatic send attempt.");
  }
  if (
    existingDraft.status !== "approved" ||
    existingDraft.automaticAction !== "auto_approve"
  ) {
    throw new Error("This draft is not approved for automatic sending.");
  }

  // Additional support-safety validation
  const supportPolicyIssues = Array.isArray(existingDraft.supportPolicyIssues)
    ? existingDraft.supportPolicyIssues
    : [];

  if (
    existingDraft.supportNeedsHuman !== false ||
    existingDraft.supportDecision !== "reply" ||
    supportPolicyIssues.length > 0 ||
    !existingDraft.reply?.trim()
  ) {
    throw new Error(
      "This draft requires human review and cannot be sent automatically.",
    );
  }

// Existing automatic-send claim logic continues below


  const claimedDraft=await draftRepository.claimForAutomaticSend(draftId,userId);
  if(!claimedDraft) {
    const currentDraft=await draftRepository.findById(draftId);
    if(!currentDraft)return null;
    if(String(currentDraft.userId)!==userId)throw new Error("Unauthorized.");
    if(currentDraft.status==="sent")throw new Error("Draft has already been sent.");
    if(currentDraft.automaticSendRecoveryRequired) {
      throw new Error("This draft requires human verification before another automatic send attempt.");
    }
    throw new Error("Draft is no longer available for automatic sending.");
  }

  const provider=claimedDraft.provider;

  if(provider!=="gmail"&&provider!=="outlook") {
    await releaseBeforeProvider(draftId,userId,`Unsupported email provider: ${provider}.`,{
      reason:"unsupported_provider",
    });
    throw new Error(`Unsupported email provider: ${provider}.`);
  }

  let email;
  try {
    email=await emailRepository.findById(String(claimedDraft.emailId));
  } catch(error) {
    await releaseBeforeProvider(draftId,userId,`Could not load original email: ${getErrorMessage(error)}`,{
      provider,reason:"original_email_lookup_failed",
    });
    throw error;
  }

  if(!email) {
    await releaseBeforeProvider(draftId,userId,"Original email was not found before automatic sending started.",{
      provider,reason:"original_email_missing",
    });
    throw new Error("Original email not found.");
  }

  if(String(email.userId)!==userId) {
    await releaseBeforeProvider(draftId,userId,"Original email does not belong to the authenticated user.",{
      provider,reason:"original_email_unauthorized",
    });
    throw new Error("Unauthorized.");
  }

  if(email.provider!==provider) {
    await releaseBeforeProvider(draftId,userId,"Draft provider does not match the original email provider.",{
      provider,reason:"provider_mismatch",
    });
    throw new Error("Draft provider does not match the original email provider.");
  }

  const recipient=getCustomerEmail(email,claimedDraft);

  if(!recipient) {
    await releaseBeforeProvider(draftId,userId,"Customer email address is required for automatic sending.",{
      provider,reason:"missing_recipient",
    });
    throw new Error("Customer email address is required for automatic sending.");
  }

  if(!claimedDraft.subject?.trim()) {
    await releaseBeforeProvider(draftId,userId,"Draft subject is required.",{
      provider,reason:"missing_subject",
    });
    throw new Error("Draft subject is required.");
  }

  if(!claimedDraft.reply?.trim()) {
    await releaseBeforeProvider(draftId,userId,"Draft reply is empty.",{
      provider,reason:"empty_reply",
    });
    throw new Error("Draft reply is empty.");
  }

  let startedDraft;
  try {
    startedDraft=await draftRepository.markAutomaticSendStarted(draftId);
  } catch(error) {
    await releaseBeforeProvider(draftId,userId,`Could not mark automatic send as started: ${getErrorMessage(error)}`,{
      provider,reason:"mark_started_failed",
    });
    throw error;
  }

  if(!startedDraft) {
    await releaseBeforeProvider(draftId,userId,"Automatic send could not be started because the send claim was lost.",{
      provider,reason:"send_claim_lost",
    });
    throw new Error("Automatic send could not be started because the send claim was lost.");
  }

  const startedAt=startedDraft.automaticSendStartedAt;

  if(!(startedAt instanceof Date)||Number.isNaN(startedAt.getTime())) {
    await releaseBeforeProvider(draftId,userId,"Automatic send start timestamp was missing or invalid; provider send was not attempted.",{
      provider,reason:"invalid_send_start_timestamp",
    });
    throw new Error("Automatic send start timestamp is missing or invalid; provider send was not attempted.");
  }

  try {
    await audit("automatic_send_started","draft",draftId,userId,{
      provider,
      emailId:String(claimedDraft.emailId),
      recipient,
      attempt:startedDraft.automaticSendAttempts,
      startedAt,
    });
  } catch(error) {
    await releaseBeforeProvider(draftId,userId,`Pre-send audit failed: ${getErrorMessage(error)}`,{
      provider,reason:"pre_send_audit_failed",emailId:String(claimedDraft.emailId),
    });
    throw new Error("Automatic sending was aborted before the provider call because the start audit failed.");
  }

  let providerResult:{id:string;threadId:string;provider:EmailProvider;sent:boolean};

  try {
    providerResult=await sendEmail({
      userId,
      provider,
      to:recipient,
      subject:claimedDraft.subject,
      reply:claimedDraft.reply,
      threadId:email.threadId||undefined,
      inReplyTo:email.messageIdHeader||undefined,
      references:email.references?.length?email.references:undefined,
      originalMessageId:email.messageId||email.messageIdHeader||undefined,
      originalMessageIdHeader:email.messageIdHeader||undefined,
    });
  } catch(error) {
    const errorMessage=getErrorMessage(error);

    if(isAmbiguousSendError(error)) {
      try {
        await markAutomaticRecoveryRequired(draftId,userId,`Automatic send result is uncertain: ${errorMessage}`,{
          provider,emailId:String(claimedDraft.emailId),recipient,error:errorMessage,reason:"ambiguous_provider_error",
        },startedAt);
      } catch(recoveryError) {
        console.error("CRITICAL: Ambiguous provider result could not be persisted:",{
          draftId,provider,error:errorMessage,recoveryError:getErrorMessage(recoveryError),
        });
      }

      throw new Error("Automatic sending could not be confirmed. Human verification is required before retrying.");
    }

    try {
      await markAutomaticRecoveryRequired(draftId,userId,`Provider send failed after the send phase began: ${errorMessage}`,{
        provider,emailId:String(claimedDraft.emailId),recipient,error:errorMessage,reason:"provider_error_after_send_started",
      },startedAt);
    } catch(recoveryError) {
      console.error("CRITICAL: Provider failure recovery persistence failed:",{
        draftId,provider,error:errorMessage,recoveryError:getErrorMessage(recoveryError),
      });
    }

    await bestEffort("Automatic-send failure audit",()=>audit(
      "automatic_send_failed","draft",draftId,userId,{
        provider,emailId:String(claimedDraft.emailId),recipient,error:errorMessage,
        reason:"provider_error_after_send_started",
      },
    ));

    throw error;
  }

  const sentAt=new Date();

  if(!providerResult?.sent||!providerResult.id?.trim()) {
    try {
      await markAutomaticRecoveryRequired(draftId,userId,"The email provider did not return a confirmed sent message ID.",{
        provider,emailId:String(claimedDraft.emailId),recipient,providerResult,reason:"unconfirmed_provider_result",
      },startedAt);
    } catch(recoveryError) {
      console.error("CRITICAL: Unconfirmed provider result recovery persistence failed:",{
        draftId,provider,recoveryError:getErrorMessage(recoveryError),
      });
    }

    throw new Error("The provider did not return a confirmed sent message. Human verification is required before retrying.");
  }

  const outboundMessageId=providerResult.id.trim();
  const outboundThreadId=providerResult.threadId?.trim()||email.threadId||"";
  let outboundEmail;

  try {
    outboundEmail=await emailRepository.create({
      userId:email.userId,
      customerId:email.customerId??null,
      draftId:claimedDraft._id,
      provider,
      direction:"outbound",
      messageId:outboundMessageId,
      messageIdHeader:"",
      references:email.references??[],
      threadId:outboundThreadId,
      subject:claimedDraft.subject.trim(),
      from:"",
      senderName:"",
      senderEmail:"",
      recipientName:email.senderName??"",
      recipientEmail:recipient,
      preview:claimedDraft.reply.trim().slice(0,240),
      body:claimedDraft.reply.trim(),
      supportProcessingStatus:"completed",
      supportProcessingError:"",
      supportProcessingStartedAt:null,
      supportProcessedAt:null,
      unread:false,
      archived:false,
      receivedAt:sentAt,
    });
  } catch(error) {
    try {
      await markAutomaticRecoveryRequired(draftId,userId,`The provider accepted the automatic reply, but the outbound email record could not be saved: ${getErrorMessage(error)}`,{
        provider,emailId:String(claimedDraft.emailId),recipient,providerMessageId:outboundMessageId,
        error:getErrorMessage(error),reason:"outbound_email_persistence_failed",
      },startedAt);
    } catch(recoveryError) {
      console.error("CRITICAL: Outbound email persistence and recovery both failed:",{
        draftId,provider,providerMessageId:outboundMessageId,
        persistenceError:getErrorMessage(error),recoveryError:getErrorMessage(recoveryError),
      });
    }

    throw new Error("The automatic reply may have been sent, but its outbound record could not be saved. Human verification is required.");
  }

  let updatedDraft;

  try {
    updatedDraft=await draftRepository.markAutomaticSendCompleted(draftId,sentAt);
  } catch(error) {
    try {
      await markAutomaticRecoveryRequired(draftId,userId,`Provider accepted the reply, but marking the draft as sent failed: ${getErrorMessage(error)}`,{
        provider,emailId:String(claimedDraft.emailId),outboundEmailId:String(outboundEmail._id),
        providerMessageId:outboundMessageId,recipient,reason:"draft_completion_update_threw",
      },startedAt);
    } catch(recoveryError) {
      console.error("CRITICAL: Draft completion and recovery both failed:",{
        draftId,provider,providerMessageId:outboundMessageId,
        completionError:getErrorMessage(error),recoveryError:getErrorMessage(recoveryError),
      });
    }

    throw new Error("The reply was sent, but the application could not confirm the sent state. Human verification is required.");
  }

  if(!updatedDraft) {
    let recoveryPersistenceError:unknown;

    try {
      await markAutomaticRecoveryRequired(draftId,userId,"Provider accepted the automatic reply, but the draft could not be marked as sent.",{
        provider,emailId:String(claimedDraft.emailId),outboundEmailId:String(outboundEmail._id),
        providerMessageId:outboundMessageId,recipient,reason:"draft_completion_update_failed",
      },startedAt);
    } catch(recoveryError) {
      recoveryPersistenceError=recoveryError;
      console.error("CRITICAL: Draft completion recovery persistence failed:",{
        draftId,provider,providerMessageId:outboundMessageId,
        recoveryError:getErrorMessage(recoveryError),
      });
    }

    if(recoveryPersistenceError) {
      throw new Error(`Recovery persistence failed. ${getErrorMessage(recoveryPersistenceError)}`);
    }

    throw new Error("Automatic reply was sent, but the application could not confirm the sent state. Human verification is required.");
  }

  await bestEffort("Original email link update",()=>emailRepository.update(
    String(email._id),{draftId:claimedDraft._id},
  ));

  await bestEffort("Automatic-send completion audit",()=>audit(
    "automatic_send_completed","draft",draftId,userId,{
      provider,emailId:String(claimedDraft.emailId),outboundEmailId:String(outboundEmail._id),
      providerMessageId:outboundMessageId,recipient,sentAt,
    },
  ));

  await recordAutomaticSendAnalytics(userId,draftId);

  await bestEffort("Automatic-send success notification",()=>notify(
    userId,"sent","Reply sent",
    `The approved customer support reply was sent automatically to ${recipient}.`,
    draftId,
  ));

  return {sent:true,provider,draftId,emailId:String(claimedDraft.emailId),sentAt};
}
