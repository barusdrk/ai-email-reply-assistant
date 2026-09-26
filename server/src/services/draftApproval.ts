import {Types} from "mongoose";
import {draftRepository} from "../repositories/DraftRepository.js";
import {approvalRepository} from "../repositories/ApprovalRepository.js";
import {audit} from "./audit.js";
import {recordDraftAnalytics} from "./supportAnalytics.js";

async function recordApprovalAnalytics(data:{
  userId:string;
  draftId:string;
  outcome:"approved"|"rejected"|"pending_approval";
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
    console.error("Approval analytics recording failed:",error);
  }
}

export async function requestApproval(id:string,userId:string){
  if(!Types.ObjectId.isValid(id))throw new Error("Invalid draft ID.");
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

  const draft=await draftRepository.findById(id);
  if(!draft)throw new Error("Draft not found.");
  if(draft.userId.toString()!==userId)throw new Error("You are not authorized to request approval for this draft.");
  if(draft.status!=="pending"&&draft.status!=="escalated"){
    throw new Error("Only pending or escalated drafts can request approval.");
  }

  const existing=await approvalRepository.findPendingByDraft(
    id,
    userId,
  );

  if(existing)return existing;

  const approval=await approvalRepository.create({
    draftId:new Types.ObjectId(id),
    emailId:draft.emailId,
    requesterId:new Types.ObjectId(userId),
    reviewerId:new Types.ObjectId(userId),
    status:"pending",
    priority:draft.status==="escalated"||draft.automaticAction==="escalate"
      ?"high"
      :"medium",
    comment:draft.automaticActionReasons.join(" "),
    requestedAt:new Date(),
  });

  await audit(
    "approval_requested",
    "draft",
    id,
    userId,
  );

  return approval;
}

export async function approveDraft(id:string,userId:string){
  if(!Types.ObjectId.isValid(id))throw new Error("Invalid draft ID.");
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

  const draft=await draftRepository.findById(id);
  if(!draft)throw new Error("Draft not found.");
  if(draft.userId.toString()!==userId){
    throw new Error("You are not authorized to approve this draft.");
  }

  if(draft.status!=="pending"&&draft.status!=="escalated"){
    throw new Error("Only pending or escalated drafts can be approved.");
  }

  if(
    draft.automaticAction!=="pending"&&
    draft.automaticAction!=="escalate"
  ){
    throw new Error("This draft is not awaiting human approval.");
  }

  const approval=await approvalRepository.findPendingByDraft(
    id,
    userId,
  );

  if(!approval){
    throw new Error("No pending approval request exists for this draft.");
  }

  const updated=await draftRepository.update(id,{
    status:"approved",
    automaticActionReasons:[],
    rejectionReason:undefined,
    escalatedAt:undefined,
    escalationReason:undefined,
    escalationReasons:[],
    approvedAt:new Date(),
  });

  if(!updated)throw new Error("Failed to approve draft.");

  await approvalRepository.update(
    approval._id.toString(),
    {
      status:"approved",
      reviewedAt:new Date(),
      reviewedBy:new Types.ObjectId(userId),
    },
  );

  await audit(
    "draft_approved",
    "draft",
    id,
    userId,
  );

  await recordApprovalAnalytics({
    userId,
    draftId:id,
    outcome:"approved",
  });

  return updated;
}

export async function rejectDraft(id:string,userId:string,reason?:string){
  if(!Types.ObjectId.isValid(id))throw new Error("Invalid draft ID.");
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

  const draft=await draftRepository.findById(id);
  if(!draft)throw new Error("Draft not found.");
  if(draft.userId.toString()!==userId){
    throw new Error("You are not authorized to reject this draft.");
  }

  if(draft.status!=="pending"&&draft.status!=="escalated"){
    throw new Error("Only pending or escalated drafts can be rejected.");
  }

  const normalizedReason=typeof reason==="string"
    ?reason.trim().slice(0,2000)
    :"";

  const updated=await draftRepository.update(id,{
    status:"rejected",
    automaticAction:"blocked",
    automaticActionReasons:normalizedReason?[normalizedReason]:[],
    rejectionReason:normalizedReason||"Draft rejected during human review.",
    escalatedAt:undefined,
    escalationReason:undefined,
    escalationReasons:[],
  });

  if(!updated)throw new Error("Failed to reject draft.");

  const approval=await approvalRepository.findPendingByDraft(
    id,
    userId,
  );

  if(approval){
    await approvalRepository.update(
      approval._id.toString(),
      {
        status:"rejected",
        reviewedAt:new Date(),
        reviewedBy:new Types.ObjectId(userId),
        comment:normalizedReason||"Draft rejected during human review.",
      },
    );
  }

  await audit(
    "draft_rejected",
    "draft",
    id,
    userId,
  );

  await recordApprovalAnalytics({
    userId,
    draftId:id,
    outcome:"rejected",
  });

  return updated;
}

export async function submitDraft(id:string,userId:string){
  if(!Types.ObjectId.isValid(id))throw new Error("Invalid draft ID.");
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

  const draft=await draftRepository.findById(id);
  if(!draft)throw new Error("Draft not found.");
  if(draft.userId.toString()!==userId){
    throw new Error("You are not authorized to submit this draft.");
  }

  const updated=await draftRepository.update(id,{
    status:"pending",
    automaticAction:"pending",
    automaticActionReasons:[],
    rejectionReason:undefined,
    escalatedAt:undefined,
    escalationReason:undefined,
    escalationReasons:[],
    approvedAt:undefined,
  });

  if(!updated)throw new Error("Failed to resubmit draft.");

  await audit(
    "draft_submitted",
    "draft",
    id,
    userId,
  );

  await recordApprovalAnalytics({
    userId,
    draftId:id,
    outcome:"pending_approval",
  });

  return updated;
}
