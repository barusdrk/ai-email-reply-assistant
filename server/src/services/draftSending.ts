import {draftRepository} from "../repositories/DraftRepository.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {sendEmail} from "./sendEmail.js";
import {sendAutomatically} from "./automaticSend.js";
import {recordDraftAnalytics} from "./supportAnalytics.js";

async function recordSendingAnalytics(data:{
  userId:string;
  draftId:string;
  outcome:"sent"|"failed";
}):Promise<void>{
  try{
    const draft=await draftRepository.findById(data.draftId);
    if(!draft)return;

    await recordDraftAnalytics({
      userId:data.userId,
      emailId:draft.emailId.toString(),
      draftId:data.draftId,
      provider:draft.provider,
      category:draft.supportCategory,
      confidenceScore:draft.confidence?.score??null,
      confidenceLevel:draft.confidence?.level??null,
      policyCompliant:draft.supportPolicyIssues.length===0,
      policyViolationCount:draft.supportPolicyIssues.length,
      automaticAction:draft.automaticAction,
      supportDecision:draft.supportDecision,
      supportNeedsHuman:draft.supportNeedsHuman,
      outcome:data.outcome,
    });
  }catch(error){
    console.error("Sending analytics recording failed:",error);
  }
}

export async function sendDraft(id:string){
  const draft=await draftRepository.findById(id);

  if(!draft)throw new Error("Draft not found.");

  if(draft.status==="sent"){
    throw new Error("Draft has already been sent.");
  }

  if(draft.automaticSendRecoveryRequired){
    throw new Error("This draft requires send recovery verification before it can be sent.");
  }

  if(draft.automaticSendInProgress){
    throw new Error("This draft is already being sent.");
  }

  if(draft.status!=="approved"){
    throw new Error("Only approved drafts can be sent.");
  }

  const userId=draft.userId.toString();

  if(draft.automaticAction==="auto_approve"){
    try{
      const result=await sendAutomatically(
        userId,
        id,
      );

      return result;
    }catch(error){
      console.error("Automatic draft sending failed:",error);
      throw error;
    }
  }

  const email=await emailRepository.findById(draft.emailId.toString());

  if(!email)throw new Error("Source email not found.");

  if(email.userId.toString()!==draft.userId.toString()){
    throw new Error("Source email does not belong to this user.");
  }

  if(email.provider!==draft.provider){
    throw new Error("Draft provider does not match the source email provider.");
  }

  const recipient=email.senderEmail?.trim()||draft.customer.trim();

  if(!recipient){
    throw new Error("Customer email address is required.");
  }

  try{
    await sendEmail({
      userId,
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
  }catch(error){
    await recordSendingAnalytics({
      userId,
      draftId:id,
      outcome:"failed",
    });

    throw error;
  }

  const sentAt=new Date();

  const updatedDraft=await draftRepository.update(id,{
    status:"sent",
    sentAt,
    rejectionReason:undefined,
    escalatedAt:undefined,
    escalationReason:undefined,
    escalationReasons:[],
  });

  if(!updatedDraft){
    throw new Error("Draft could not be updated after sending.");
  }

  await recordSendingAnalytics({
    userId,
    draftId:id,
    outcome:"sent",
  });

  return updatedDraft;
}
