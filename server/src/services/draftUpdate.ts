import {draftRepository} from "../repositories/DraftRepository.js";
import {requestApproval} from "./draftApproval.js";
import {analyzeDraftSupport,applySupportDecision,evaluateDraftPolicy,scoreDraftConfidence} from "./draftSupport.js";
import {determineAutomaticAction} from "./automaticActions.js";
import {recordDraftAnalytics} from "./supportAnalytics.js";
import {isValidObjectId} from "./draftValidation.js";
import type {UpdateDraftData} from "./draftTypes.js";
import {SUPPORT_CATEGORIES,type SupportCategory,type DraftStatus} from "../models/Draft.js";

function normalizeSupportCategory(value:string):SupportCategory{
  return (SUPPORT_CATEGORIES as readonly string[]).includes(value)?value as SupportCategory:"general_support";
}
function getDraftStatus(action:"auto_approve"|"pending"|"escalate"|"blocked"):DraftStatus{
  if(action==="escalate")return "escalated";
  if(action==="auto_approve")return "approved";
  if(action==="blocked")return "rejected";
  return "pending";
}
async function recordDraftAnalyticsSafely(data:Parameters<typeof recordDraftAnalytics>[0]):Promise<void>{
  try{await recordDraftAnalytics(data);}catch(error){console.error("Support analytics recording failed:",error);}
}

export async function updateDraft(id:string,data:UpdateDraftData){
  if(!isValidObjectId(id))throw new Error("Invalid draft ID.");
  const existingDraft=await draftRepository.findById(id);
  if(!existingDraft)throw new Error("Draft not found.");
  if(existingDraft.status==="sent")throw new Error("Sent drafts cannot be modified.");
  if(existingDraft.automaticSendInProgress)throw new Error("This draft is currently being sent and cannot be modified.");
  if(existingDraft.automaticSendRecoveryRequired)throw new Error("This draft requires send recovery verification before it can be modified.");
  const userId=existingDraft.userId.toString();
  const emailId=existingDraft.emailId.toString();
  const tone=data.tone??existingDraft.tone;
  const length=data.length??existingDraft.length;
  const reply=data.reply?.trim()||existingDraft.reply;
  if(!reply)throw new Error("Reply is required.");

  const support=await analyzeDraftSupport(userId,emailId,existingDraft.customer,tone,length);
  const confidence=await scoreDraftConfidence(userId,support.customerEmailBody,reply,support.knowledgeBase);
  const policy=await evaluateDraftPolicy(userId,support.customerEmailBody,reply,support.knowledgeBase);
  const evaluatedAction=applySupportDecision(determineAutomaticAction(support.customerEmailBody,confidence,policy),support.supportResult);
  // Editing changes the content after its previous approval. Never auto-send an edited draft:
  // even if it passes automated checks, send it back through explicit human approval.
  const automaticAction=evaluatedAction.action==="auto_approve"
    ?{...evaluatedAction,action:"pending" as const,reasons:[]}
    :evaluatedAction;
  const supportCategory=normalizeSupportCategory(support.supportResult.category);
  const policyIssues=[...support.supportResult.policyIssues,...policy.violations].filter(Boolean);
  // A confidence-based escalation is a human-review decision even when the support
  // engine independently considers the customer's request answerable.
  const supportDecision=automaticAction.action==="escalate"&&support.supportResult.decision==="reply"
    ?"human_review"
    :support.supportResult.decision;
  const supportNeedsHuman=support.supportResult.needsHuman||
    supportDecision!=="reply"||policyIssues.length>0||automaticAction.action==="escalate";
  const supportReason=supportDecision!==support.supportResult.decision&&automaticAction.reasons.length>0
    ?automaticAction.reasons.join(" ")
    :support.supportResult.reason;
  const status=getDraftStatus(automaticAction.action);
  const now=new Date();
  const updateData={
    ...data,reply,tone,length,confidence,supportCategory,
    supportSentiment:support.supportResult.sentiment,
    supportConfidence:support.supportResult.confidence,
    supportDecision,
    supportNeedsHuman,
    supportReason,
    supportSuggestedActions:support.supportResult.suggestedActions,
    supportMissingInformation:support.supportResult.missingInformation,
    supportPolicyIssues:policyIssues,
    automaticAction:automaticAction.action,
    automaticActionReasons:automaticAction.reasons,
    status,
    escalatedAt:automaticAction.action==="escalate"?now:undefined,
    escalationReason:automaticAction.action==="escalate"?automaticAction.reasons[0]:undefined,
    escalationReasons:automaticAction.action==="escalate"?automaticAction.reasons:[],
    approvedAt:automaticAction.action==="auto_approve"?now:undefined,
    rejectionReason:automaticAction.action==="blocked"?automaticAction.reasons.join(" "):undefined,
  };
  const updatedDraft=await draftRepository.updateAutomationState(id,updateData);
  if(!updatedDraft)throw new Error("Failed to update draft.");
  await recordDraftAnalyticsSafely({
    userId,emailId,draftId:updatedDraft._id.toString(),provider:updatedDraft.provider,
    category:supportCategory,confidenceScore:confidence.score,confidenceLevel:confidence.level,
    policyCompliant:policy.compliant,policyViolationCount:policy.violations.length,
    automaticAction:automaticAction.action,supportDecision,
    supportNeedsHuman,
    outcome:automaticAction.action==="auto_approve"?"approved":automaticAction.action==="pending"?"pending_approval":automaticAction.action==="escalate"?"escalated":"blocked",
  });
  console.log("DRAFT UPDATED:",{
    draftId:updatedDraft._id.toString(),emailId,provider:updatedDraft.provider,
    supportDecision,supportNeedsHuman,supportReason,supportCategory,
    supportConfidence:support.supportResult.confidence,confidence:confidence.score,
    confidenceLevel:confidence.level,policyCompliant:policy.compliant,
    automaticAction:automaticAction.action,
    customerContext:{email:support.customerContext.email??null,name:support.customerContext.name??null,metadata:support.customerContext.metadata??null},
  });
  if(automaticAction.action==="pending"||automaticAction.action==="escalate")await requestApproval(updatedDraft._id.toString(),userId);
  return updatedDraft;
}
