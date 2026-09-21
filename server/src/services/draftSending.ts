import {draftRepository} from "../repositories/DraftRepository.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {sendEmail} from "./sendEmail.js";

export async function sendDraft(id:string){
  const draft=await draftRepository.findById(id);
  if(!draft)throw new Error("Draft not found.");
  if(draft.status==="sent")throw new Error("Draft has already been sent.");
  if(draft.status!=="approved")throw new Error("Only approved drafts can be sent.");

  const email=await emailRepository.findById(draft.emailId.toString());
  if(!email)throw new Error("Source email not found.");
  if(email.userId.toString()!==draft.userId.toString())throw new Error("Source email does not belong to this user.");
  if(email.provider!==draft.provider)throw new Error("Draft provider does not match the source email provider.");

  const recipient=email.senderEmail?.trim()||draft.customer.trim();
  if(!recipient)throw new Error("Customer email address is required.");

  await sendEmail({
    userId:draft.userId.toString(),
    provider:draft.provider,
    to:recipient,
    subject:draft.subject,
    reply:draft.reply,
    threadId:email.threadId||undefined,
    inReplyTo:email.messageIdHeader||undefined,
    references:email.references?.filter(Boolean),
    originalMessageId:email.messageId||undefined,
    originalMessageIdHeader:email.messageIdHeader||undefined,
  });

  const sentAt=new Date();

  const updatedDraft=await draftRepository.update(id,{
    status:"sent",
    sentAt,
    rejectionReason:undefined,
    escalatedAt:undefined,
    escalationReason:undefined,
    escalationReasons:[],
  });

  if(!updatedDraft)throw new Error("Draft could not be updated after sending.");

  return updatedDraft;
}
