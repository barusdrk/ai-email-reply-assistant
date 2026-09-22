import {Types} from "mongoose";
import {draftRepository} from "../repositories/DraftRepository.js";
import {audit} from "./audit.js";

export async function approveDraft(id:string,userId:string){
  if(!Types.ObjectId.isValid(id))throw new Error("Invalid draft ID.");
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  const draft=await draftRepository.findById(id);
  if(!draft)throw new Error("Draft not found.");
  if(draft.userId.toString()!==userId)throw new Error("You are not authorized to approve this draft.");
  if(draft.status!=="pending")throw new Error("Only pending drafts can be approved.");
  if(draft.automaticAction!=="pending")throw new Error("This draft is not awaiting approval.");
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
  await audit("draft_approved","draft",id,userId);
  return updated;
}

export async function rejectDraft(id:string,userId:string,reason?:string){
  if(!Types.ObjectId.isValid(id))throw new Error("Invalid draft ID.");
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  const draft=await draftRepository.findById(id);
  if(!draft)throw new Error("Draft not found.");
  if(draft.userId.toString()!==userId)throw new Error("You are not authorized to reject this draft.");
  if(draft.status!=="pending"&&draft.status!=="escalated")throw new Error("Only pending or escalated drafts can be rejected.");
  const normalizedReason=typeof reason==="string"?reason.trim().slice(0,2000):"";
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
  await audit("draft_rejected","draft",id,userId);
  return updated;
}

export async function submitDraft(id:string,userId:string){
  if(!Types.ObjectId.isValid(id))throw new Error("Invalid draft ID.");
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  const draft=await draftRepository.findById(id);
  if(!draft)throw new Error("Draft not found.");
  if(draft.userId.toString()!==userId)throw new Error("You are not authorized to submit this draft.");
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
  await audit("draft_submitted","draft",id,userId);
  return updated;
}
