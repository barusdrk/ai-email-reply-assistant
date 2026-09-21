import {Types} from "mongoose";
import {approvalRepository} from "../repositories/ApprovalRepository.js";
import {draftRepository} from "../repositories/DraftRepository.js";
import {notify} from "./notification.js";
import {audit} from "./audit.js";
import {approveDraft,rejectDraft,submitDraft} from "./drafts.js";

function isValidId(id:string):boolean{
  return Types.ObjectId.isValid(id);
}

export async function approvals(userId:string){
  if(!isValidId(userId))throw new Error("Invalid reviewer ID.");
  return approvalRepository.findAll(userId);
}

export async function approval(id:string,reviewerId:string){
  if(!isValidId(id)||!isValidId(reviewerId))return null;
  return approvalRepository.findByIdForReviewer(id,reviewerId);
}

export async function requestApproval(draftId:string,reviewerId:string){
  if(!isValidId(draftId))throw new Error("Invalid draft ID.");
  if(!isValidId(reviewerId))throw new Error("Invalid reviewer ID.");
  const draft=await draftRepository.findById(draftId);
  if(!draft)throw new Error("Draft not found.");
  if(draft.automaticAction!=="pending"&&draft.automaticAction!=="escalate")throw new Error("This draft does not require human approval.");
  if(!draft.emailId)throw new Error("Draft is not associated with an email.");
  if(!draft.userId)throw new Error("Draft is not associated with a requester.");
  const existing=await approvalRepository.findPendingByDraft(draftId,reviewerId);
  if(existing)return existing;
  const item=await approvalRepository.create({
    draftId:draft._id,
    emailId:draft.emailId,
    requesterId:draft.userId,
    reviewerId:new Types.ObjectId(reviewerId),
    status:"pending",
    priority:draft.automaticAction==="escalate"?"high":"medium",
  });
  await notify(
    reviewerId,
    "approval",
    "Approval requested",
    `A draft for ${draft.customer} is awaiting review.`,
    draftId
  );
  await audit("approval_requested","draft",draftId,reviewerId);
  return item;
}

export async function approve(id:string,reviewerId:string){
  if(!isValidId(id)||!isValidId(reviewerId))return null;
  const item=await approvalRepository.findByIdForReviewerAction(id,reviewerId);
  if(!item)return null;
  if(item.status!=="pending")throw new Error("Only pending approvals can be approved.");
  await approveDraft(item.draftId.toString(),reviewerId);
  const updated=await approvalRepository.update(id,{
    status:"approved",
    reviewedBy:new Types.ObjectId(reviewerId),
    reviewedAt:new Date(),
  });
  await audit("approval_approved","approval",id,reviewerId);
  return updated;
}

export async function reject(id:string,reviewerId:string,comment?:string){
  if(!isValidId(id)||!isValidId(reviewerId))return null;
  const item=await approvalRepository.findByIdForReviewerAction(id,reviewerId);
  if(!item)return null;
  if(item.status!=="pending")throw new Error("Only pending approvals can be rejected.");
  const normalizedComment=typeof comment==="string"?comment.trim().slice(0,2000):"";
  await rejectDraft(item.draftId.toString(),reviewerId,normalizedComment);
  const updated=await approvalRepository.update(id,{
    status:"rejected",
    comment:normalizedComment,
    reviewedBy:new Types.ObjectId(reviewerId),
    reviewedAt:new Date(),
  });
  await audit("approval_rejected","approval",id,reviewerId);
  return updated;
}

export async function submit(id:string,reviewerId:string){
  if(!isValidId(id)||!isValidId(reviewerId))return null;
  const item=await approvalRepository.findByIdForReviewerAction(id,reviewerId);
  if(!item)return null;
  if(item.status!=="pending")throw new Error("Only pending approvals can be resubmitted.");
  const draft=await draftRepository.findById(item.draftId.toString());
  if(!draft)throw new Error("Draft not found.");
  if(draft.status!=="escalated")throw new Error("Only escalated drafts can be resubmitted.");
  await submitDraft(item.draftId.toString(),item.requesterId.toString());
  const updated=await approvalRepository.update(id,{
    status:"pending",
    reviewedBy:undefined,
    reviewedAt:undefined,
    comment:"",
  });
  await audit("approval_resubmitted","approval",id,reviewerId);
  return updated;
}

export async function deleteApproval(id:string,reviewerId:string){
  if(!isValidId(id)||!isValidId(reviewerId))return null;
  const item=await approvalRepository.findByIdForReviewerAction(id,reviewerId);
  if(!item)return null;
  await audit("approval_deleted","approval",id,reviewerId);
  return approvalRepository.delete(id);
}
