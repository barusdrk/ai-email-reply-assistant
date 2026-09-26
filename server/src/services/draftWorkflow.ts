import {Types} from "mongoose";
import {draftRepository} from "../repositories/DraftRepository.js";
import {requestApproval} from "./draftApproval.js";

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

  await requestApproval(
    updated._id.toString(),
    userId,
  );

  return updated;
}
