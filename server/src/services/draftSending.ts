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
  if(draft.status==="sent")throw new Error("Draft has already been sent.");
  if(draft.automaticSendRecoveryRequired)throw new Error("This draft requires send recovery verification before it can be sent.");
  if(draft.automaticSendInProgress)throw new Error("This draft is already being sent.");
  if(draft.status!=="approved")throw new Error("Only approved drafts can be sent.");

  const userId=draft.userId.toString();

  if(draft.automaticAction==="auto_approve"){
    try{
      return await sendAutomatically(userId,id);
    }catch(error){
      console.error("Automatic draft sending failed:",error);
      throw error;
    }
  }

  // Atomically claim the draft so only one concurrent manual send can proceed.
  const claimedDraft=await draftRepository.claimForManualSend(id);
  if(!claimedDraft)throw new Error("Draft is already being sent or is no longer eligible to send.");

  let providerCallStarted = false;

  try {
    const email = await emailRepository.findById(claimedDraft.emailId.toString());
    if (!email) throw new Error("Source email not found.");
    if (email.userId.toString() !== claimedDraft.userId.toString()) throw new Error("Source email does not belong to this user.");
    if (email.provider !== claimedDraft.provider) throw new Error("Draft provider does not match the source email provider.");

    const recipient = email.senderEmail?.trim() || claimedDraft.customer.trim();
    if (!recipient) throw new Error("Customer email address is required.");

    providerCallStarted = true;
    const providerResult = await sendEmail({
      userId,
      provider: claimedDraft.provider,
      to: recipient,
      subject: claimedDraft.subject,
      reply: claimedDraft.reply,
      threadId: email.threadId || undefined,
      inReplyTo: email.messageIdHeader || undefined,
      references: email.references?.filter(Boolean),
      originalMessageId: email.messageId || undefined,
      originalMessageIdHeader: email.messageIdHeader || undefined,
    });

    if (!providerResult?.sent || !providerResult.id?.trim()) {
      throw new Error("The provider did not confirm the sent message. Human verification is required.");
    }

    const updatedDraft = await draftRepository.update(id, {
      status: "sent",
      sentAt: new Date(),
      automaticSendInProgress: false,
      automaticSendRecoveryRequired: false,
      rejectionReason: undefined,
      escalatedAt: undefined,
      escalationReason: undefined,
      escalationReasons: [],
    });

    if (!updatedDraft) throw new Error("The email may have been sent, but the draft could not be updated.");

    await recordSendingAnalytics({ userId, draftId: id, outcome: "sent" });
    return updatedDraft;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown send failure.";

    if (providerCallStarted) {
      try {
        await draftRepository.markAutomaticRecoveryRequired(
          id,
          `Manual send outcome requires verification: ${message}`,
        );
      } catch (recoveryError) {
        console.error("Manual send recovery marking failed:", recoveryError);
      }
    } else {
      try {
        await draftRepository.update(id, { automaticSendInProgress: false });
      } catch (releaseError) {
        console.error("Manual send claim release failed:", releaseError);
      }
    }

    await recordSendingAnalytics({ userId, draftId: id, outcome: "failed" });
    throw error;
  }
}
