import {Types} from "mongoose";
import {draftRepository} from "../repositories/DraftRepository.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {sendEmail} from "./sendEmail.js";
import {notify} from "./notification.js";
import {audit} from "./audit.js";

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

  const claimedDraft=await draftRepository.claimForAutomaticSend(draftId,userId);

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

  const email=await emailRepository.findById(String(claimedDraft.emailId));

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

  const startedDraft=await draftRepository.markAutomaticSendStarted(draftId);

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

  try{
    await sendEmail({
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
  }catch(error){
    const errorMessage=getErrorMessage(error);

    if(isAmbiguousSendError(error)){
      const recoveryDraft=await draftRepository.markAutomaticRecoveryRequired(
        draftId,
        `Automatic send result is uncertain: ${errorMessage}`,
      );

      if(recoveryDraft){
        await audit(
          "automatic_send_recovery_required",
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

        await notify(
          userId,
          "approval",
          "Automatic reply requires verification",
          "The automatic reply may have reached the email provider, but the result could not be confirmed. Verify the provider Sent folder before retrying.",
          draftId,
        );
      }

      throw new Error("Automatic sending could not be confirmed. Human verification is required before retrying.");
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

  const updatedDraft=await draftRepository.markAutomaticSendCompleted(
    draftId,
    sentAt,
  );

  if(!updatedDraft){
    const recoveryDraft=await draftRepository.markAutomaticRecoveryRequired(
      draftId,
      "Provider accepted the automatic reply, but the draft could not be marked as sent. Verify the provider Sent folder before retrying.",
    );

    if(recoveryDraft){
      await audit(
        "automatic_send_recovery_required",
        "draft",
        draftId,
        userId,
        {
          provider,
          emailId:String(claimedDraft.emailId),
          recipient,
          reason:"Provider send succeeded but draft completion update failed.",
        },
      );

      await notify(
        userId,
        "approval",
        "Automatic reply requires verification",
        "The provider accepted the automatic reply, but the application could not confirm the sent state. Verify the provider Sent folder before retrying.",
        draftId,
      );
    }

    throw new Error("Automatic reply was sent, but the application could not confirm the sent state. Human verification is required.");
  }

  await emailRepository.update(String(email._id),{
    draftId:claimedDraft._id,
  });

  await audit(
    "automatic_send_completed",
    "draft",
    draftId,
    userId,
    {
      provider,
      emailId:String(claimedDraft.emailId),
      recipient,
      sentAt,
    },
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
