import {draftRepository} from "../repositories/DraftRepository.js";
import {sendAutomatically} from "./automaticSend.js";
import {requestApproval} from "./draftApproval.js";
import {analyzeDraftSupport,applySupportDecision,evaluateDraftPolicy,scoreDraftConfidence} from "./draftSupport.js";
import {determineAutomaticAction} from "./automaticActions.js";
import {recordDraftAnalytics} from "./supportAnalytics.js";
import {isValidObjectId} from "./draftValidation.js";
import type {UpdateDraftData} from "./draftTypes.js";
import {SUPPORT_CATEGORIES,type SupportCategory,type DraftStatus} from "../models/Draft.js";

function normalizeSupportCategory(value:string):SupportCategory{
  return (SUPPORT_CATEGORIES as readonly string[]).includes(value)
    ?value as SupportCategory
    :"general_support";
}

function getDraftStatus(action:"auto_approve"|"pending"|"escalate"|"blocked"):DraftStatus{
  if(action==="escalate")return "escalated";
  if(action==="auto_approve")return "approved";
  if(action==="blocked")return "rejected";
  return "pending";
}

async function recordDraftAnalyticsSafely(data:Parameters<typeof recordDraftAnalytics>[0]):Promise<void>{
  try{
    await recordDraftAnalytics(data);
  }catch(error){
    console.error("Support analytics recording failed:",error);
  }
}

export async function updateDraft(id:string,data:UpdateDraftData){
  if(!isValidObjectId(id))throw new Error("Invalid draft ID.");
  const existingDraft=await draftRepository.findById(id);
  if(!existingDraft)throw new Error("Draft not found.");

  const userId=existingDraft.userId.toString();
  const emailId=existingDraft.emailId.toString();
  const tone=data.tone??existingDraft.tone;
  const length=data.length??existingDraft.length;
  const reply=data.reply?.trim()||existingDraft.reply;

  if(!reply)throw new Error("Reply is required.");

  const support=await analyzeDraftSupport(
    userId,
    emailId,
    existingDraft.customer,
    tone,
    length,
  );

  const confidence=await scoreDraftConfidence(
    userId,
    support.customerEmailBody,
    reply,
    support.knowledgeBase,
  );

  const policy=await evaluateDraftPolicy(
    userId,
    support.customerEmailBody,
    reply,
    support.knowledgeBase,
  );

  const automaticAction=applySupportDecision(
    determineAutomaticAction(
      support.customerEmailBody,
      confidence,
      policy,
    ),
    support.supportResult,
  );

  const supportCategory=normalizeSupportCategory(
    support.supportResult.category,
  );

  const policyIssues=[
    ...support.supportResult.policyIssues,
    ...policy.violations,
  ].filter(Boolean);

  const status=getDraftStatus(automaticAction.action);
  const now=new Date();

  const updatedDraft=await draftRepository.update(id,{
    ...data,
    reply,
    tone,
    length,
    confidence,
    supportCategory,
    supportSentiment:support.supportResult.sentiment,
    supportConfidence:support.supportResult.confidence,
    supportDecision:support.supportResult.decision,
    supportNeedsHuman:support.supportResult.needsHuman,
    supportReason:support.supportResult.reason,
    supportSuggestedActions:support.supportResult.suggestedActions,
    supportMissingInformation:support.supportResult.missingInformation,
    supportPolicyIssues:policyIssues,
    automaticAction:automaticAction.action,
    automaticActionReasons:automaticAction.reasons,
    status,
    escalatedAt:automaticAction.action==="escalate"?now:undefined,
    escalationReason:automaticAction.action==="escalate"
      ?automaticAction.reasons[0]
      :undefined,
    escalationReasons:automaticAction.action==="escalate"
      ?automaticAction.reasons
      :[],
    approvedAt:automaticAction.action==="auto_approve"?now:undefined,
    rejectionReason:automaticAction.action==="blocked"
      ?automaticAction.reasons.join(" ")
      :undefined,
    automaticSendInProgress:false,
  });

  if(!updatedDraft)throw new Error("Failed to update draft.");

  await recordDraftAnalyticsSafely({
    userId,
    emailId,
    draftId:updatedDraft._id.toString(),
    provider:updatedDraft.provider,
    category:supportCategory,
    confidenceScore:confidence.score,
    confidenceLevel:confidence.level,
    policyCompliant:policy.compliant,
    policyViolationCount:policy.violations.length,
    automaticAction:automaticAction.action,
    supportDecision:support.supportResult.decision,
    supportNeedsHuman:support.supportResult.needsHuman,
    outcome:automaticAction.action==="auto_approve"
      ?"approved"
      :automaticAction.action==="pending"
        ?"pending_approval"
        :automaticAction.action==="escalate"
          ?"escalated"
          :"blocked",
  });

  console.log("DRAFT UPDATED:",{
    draftId:updatedDraft._id.toString(),
    emailId,
    provider:updatedDraft.provider,
    supportDecision:support.supportResult.decision,
    supportCategory,
    supportConfidence:support.supportResult.confidence,
    confidence:confidence.score,
    confidenceLevel:confidence.level,
    policyCompliant:policy.compliant,
    automaticAction:automaticAction.action,
    status,
    customerContext:{
      email:support.customerContext.email??null,
      name:support.customerContext.name??null,
      metadata:support.customerContext.metadata??null,
    },
  });

  if(automaticAction.action==="auto_approve"){
    try{
      await sendAutomatically(
        userId,
        updatedDraft._id.toString(),
      );
    }catch(error){
      console.error("Automatic draft sending failed:",error);
    }
    return (await draftRepository.findById(
      updatedDraft._id.toString(),
    ))??updatedDraft;
  }

  if(
    automaticAction.action==="pending"||
    automaticAction.action==="escalate"
  ){
    await requestApproval(
      updatedDraft._id.toString(),
      userId,
    );
  }

  return updatedDraft;
}
