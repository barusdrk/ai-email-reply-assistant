import {Types} from "mongoose";
import {draftRepository} from "../repositories/DraftRepository.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {sendEmail} from "./sendEmail.js";
import {notify} from "./notification.js";
import {audit} from "./audit.js";
import {recordDraftAnalytics} from "./supportAnalytics.js";

export interface AutomaticSendResult {
  sent:boolean;
  provider:"gmail"|"outlook";
  draftId:string;
  emailId:string;
  sentAt:Date;
}

function getCustomerEmail(email:{senderEmail?:string}|null,draft:{customer?:string}):string{
  const senderEmail=String(email?.senderEmail??"").trim();
  if(senderEmail)return senderEmail;
  return String(draft.customer??"").trim();
}

function getErrorMessage(error:unknown):string{
  return error instanceof Error?error.message:"Automatic email sending failed.";
}

function isAmbiguousSendError(error:unknown):boolean{
  const message=getErrorMessage(error).toLowerCase();
  return message.includes("timeout")||
    message.includes("timed out")||
    message.includes("network")||
    message.includes("socket")||
    message.includes("connection")||
    message.includes("econnreset")||
    message.includes("econnrefused")||
    message.includes("etimedout")||
    message.includes("provider response")||
    message.includes("unknown response");
}

async function markAutomaticRecoveryRequired(
  draftId:string,
  userId:string,
  message:string,
  details:Record<string,unknown>,
):Promise<void>{
  const recoveryDraft=await draftRepository.markAutomaticRecoveryRequired(
    draftId,
    message,
  );

  if(!recoveryDraft)return;

  await audit(
    "automatic_send_recovery_required",
    "draft",
    draftId,
    userId,
    details,
  );

  await notify(
    userId,
    "approval",
    "Automatic reply requires verification",
    "The automatic reply may have reached the email provider, but the application could not fully confirm the result. Verify the provider Sent folder before retrying.",
    draftId,
  );
}

async function recordAutomaticSendAnalytics(
  userId:string,
  draftId:string,
):Promise<void>{
  try{
    const draft=await draftRepository.findById(draftId);
    if(!draft)return;

    await recordDraftAnalytics({
      userId,
      emailId:draft.emailId.toString(),
      draftId,
      provider:draft.provider,
      category:draft.supportCategory,
      confidenceScore:draft.confidence?.score??null,
      confidenceLevel:draft.confidence?.level??null,
      policyCompliant:draft.supportPolicyIssues.length===0,
      policyViolationCount:draft.supportPolicyIssues.length,
      automaticAction:draft.automaticAction,
      supportDecision:draft.supportDecision,
      supportNeedsHuman:draft.supportNeedsHuman,
      outcome:"auto_sent",
    });
  }catch(error){
    console.error("Automatic send analytics recording failed:",error);
  }
}

export async function sendAutomatically(userId:string,draftId:string):Promise<AutomaticSendResult|null>{
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  if(!Types.ObjectId.isValid(draftId))throw new Error("Invalid draft ID.");

  const existingDraft=await draftRepository.findById(draftId);

  if(!existingDraft)return null;

  if(String(existingDraft.userId)!==userId)throw new Error("Unauthorized.");

  if(existingDraft.status==="sent")throw new Error("Draft has already been sent.");

  if(existingDraft.automaticSendRecoveryRequired){
    throw new Error("This draft requires human verification before another automatic send attempt.");
  }

  if(existingDraft.status!=="approved"||existingDraft.automaticAction!=="auto_approve"){
    throw new Error("This draft is not approved for automatic sending.");
  }

  const claimedDraft=await draftRepository.claimForAutomaticSend(
    draftId,
    userId,
  );

  if(!claimedDraft){
    const currentDraft=await draftRepository.findById(draftId);

    if(!currentDraft)return null;

    if(String(currentDraft.userId)!==userId)throw new Error("Unauthorized.");

    if(currentDraft.status==="sent")throw new Error("Draft has already been sent.");

    if(currentDraft.automaticSendRecoveryRequired){
      throw new Error("This draft requires human verification before another automatic send attempt.");
    }

    throw new Error("Draft is no longer available for automatic sending.");
  }

  const provider=claimedDraft.provider;

  if(provider!=="gmail"&&provider!=="outlook"){
    await draftRepository.releaseAutomaticClaim(
      draftId,
      `Unsupported email provider: ${provider}.`,
    );

    throw new Error(`Unsupported email provider: ${provider}.`);
  }

  const email=await emailRepository.findById(
    String(claimedDraft.emailId),
  );

  if(!email){
    await draftRepository.releaseAutomaticClaim(
      draftId,
      "Original email was not found before automatic sending started.",
    );

    throw new Error("Original email not found.");
  }

  if(String(email.userId)!==userId){
    await draftRepository.releaseAutomaticClaim(
      draftId,
      "Original email does not belong to the authenticated user.",
    );

    throw new Error("Unauthorized.");
  }

  if(email.provider!==provider){
    await draftRepository.releaseAutomaticClaim(
      draftId,
      "Draft provider does not match the original email provider.",
    );

    throw new Error("Draft provider does not match the original email provider.");
  }

  const recipient=getCustomerEmail(email,claimedDraft);

  if(!recipient){
    await draftRepository.releaseAutomaticClaim(
      draftId,
      "Customer email address is required for automatic sending.",
    );

    throw new Error("Customer email address is required for automatic sending.");
  }

  if(!claimedDraft.subject?.trim()){
    await draftRepository.releaseAutomaticClaim(
      draftId,
      "Draft subject is required.",
    );

    throw new Error("Draft subject is required.");
  }

  if(!claimedDraft.reply?.trim()){
    await draftRepository.releaseAutomaticClaim(
      draftId,
      "Draft reply is empty.",
    );

    throw new Error("Draft reply is empty.");
  }

  const startedDraft=await draftRepository.markAutomaticSendStarted(
    draftId,
  );

  if(!startedDraft){
    throw new Error("Automatic send could not be started because the send claim was lost.");
  }

  const startedAt=new Date();

  await audit(
    "automatic_send_started",
    "draft",
    draftId,
    userId,
    {
      provider,
      emailId:String(claimedDraft.emailId),
      recipient,
      attempt:startedDraft.automaticSendAttempts,
      startedAt,
    },
  );

  let providerResult:{
    id:string;
    threadId:string;
    provider:"gmail"|"outlook";
    sent:boolean;
  };

  try{
    providerResult=await sendEmail({
      userId,
      provider,
      to:recipient,
      subject:claimedDraft.subject,
      reply:claimedDraft.reply,
      threadId:email.threadId||undefined,
      inReplyTo:email.messageIdHeader||undefined,
      references:email.references?.length
        ?email.references
        :undefined,
      originalMessageId:email.messageId||email.messageIdHeader||undefined,
      originalMessageIdHeader:email.messageIdHeader||undefined,
    });
  }catch(error){
    const errorMessage=getErrorMessage(error);

    if(isAmbiguousSendError(error)){
      await markAutomaticRecoveryRequired(
        draftId,
        userId,
        `Automatic send result is uncertain: ${errorMessage}`,
        {
          provider,
          emailId:String(claimedDraft.emailId),
          recipient,
          error:errorMessage,
        },
      );

      throw new Error(
        "Automatic sending could not be confirmed. Human verification is required before retrying.",
      );
    }

    const released=await draftRepository.releaseAutomaticClaim(
      draftId,
      errorMessage,
    );

    if(released){
      await audit(
        "automatic_send_failed",
        "draft",
        draftId,
        userId,
        {
          provider,
          emailId:String(claimedDraft.emailId),
          recipient,
          error:errorMessage,
        },
      );
    }

    throw error;
  }

  const sentAt=new Date();

  if(!providerResult?.sent||!providerResult.id?.trim()){
    await markAutomaticRecoveryRequired(
      draftId,
      userId,
      "The email provider did not return a confirmed sent message ID.",
      {
        provider,
        emailId:String(claimedDraft.emailId),
        recipient,
        providerResult,
      },
    );

    throw new Error(
      "The provider did not return a confirmed sent message. Human verification is required before retrying.",
    );
  }

  const outboundMessageId=providerResult.id.trim();
  const outboundThreadId=
    providerResult.threadId?.trim()||
    email.threadId||
    "";

  let outboundEmail;

  try{
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
  }catch(error){
    const errorMessage=getErrorMessage(error);

    await markAutomaticRecoveryRequired(
      draftId,
      userId,
      `The provider accepted the automatic reply, but the outbound email record could not be saved: ${errorMessage}`,
      {
        provider,
        emailId:String(claimedDraft.emailId),
        recipient,
        providerMessageId:outboundMessageId,
        error:errorMessage,
        reason:"outbound_email_persistence_failed",
      },
    );

    throw new Error(
      "The automatic reply was sent, but the outbound email record could not be saved. Human verification is required.",
    );
  }

  const updatedDraft=await draftRepository.markAutomaticSendCompleted(
    draftId,
    sentAt,
  );

  if(!updatedDraft){
    await markAutomaticRecoveryRequired(
      draftId,
      userId,
      "Provider accepted the automatic reply, but the draft could not be marked as sent.",
      {
        provider,
        emailId:String(claimedDraft.emailId),
        outboundEmailId:String(outboundEmail._id),
        providerMessageId:outboundMessageId,
        recipient,
        reason:"draft_completion_update_failed",
      },
    );

    throw new Error(
      "Automatic reply was sent, but the application could not confirm the sent state. Human verification is required.",
    );
  }

  await emailRepository.update(
    String(email._id),
    {
      draftId:claimedDraft._id,
    },
  );

  await audit(
    "automatic_send_completed",
    "draft",
    draftId,
    userId,
    {
      provider,
      emailId:String(claimedDraft.emailId),
      outboundEmailId:String(outboundEmail._id),
      providerMessageId:outboundMessageId,
      recipient,
      sentAt,
    },
  );

  await recordAutomaticSendAnalytics(
    userId,
    draftId,
  );

  await notify(
    userId,
    "sent",
    "Reply sent",
    `The approved customer support reply was sent automatically to ${recipient}.`,
    draftId,
  );

  return {
    sent:true,
    provider,
    draftId,
    emailId:String(claimedDraft.emailId),
    sentAt,
  };
}
