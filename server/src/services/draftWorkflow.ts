import {Types} from "mongoose";
import {draftRepository} from "../repositories/DraftRepository.js";
import {updateDraft as updateDraftService} from "./draftUpdate.js";
import {approvalRepository} from "../repositories/ApprovalRepository.js";

export async function submitDraft(id:string,userId:string){
  if(!Types.ObjectId.isValid(id))throw new Error("Invalid draft ID.");
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  const draft=await draftRepository.findById(id);
  if(!draft)throw new Error("Draft not found.");
  if(draft.userId.toString()!==userId)throw new Error("You are not authorized to submit this draft.");
  if(draft.status!=="rejected"&&draft.status!=="escalated")throw new Error("Only rejected or escalated drafts can be resubmitted.");
  if(draft.automaticSendInProgress)throw new Error("This draft is currently being sent and cannot be submitted.");
  if(draft.automaticSendRecoveryRequired)throw new Error("This draft requires send recovery verification before it can be submitted.");
  const updated=await updateDraftService(id,{reply:draft.reply});
  if(updated.status==="rejected"){
    const pendingApproval=await approvalRepository.findPendingByDraft(id,userId);
    if(pendingApproval){
      await approvalRepository.update(pendingApproval._id.toString(),{
        status:"rejected",
        reviewedAt:new Date(),
        reviewedBy:new Types.ObjectId(userId),
        comment:"The draft remained blocked after support and policy re-evaluation.",
      });
    }
    const reasons=updated.automaticActionReasons?.filter(Boolean).join(" ");
    throw new Error(reasons ? "This draft remains blocked after re-evaluation: "+reasons : "This draft remains blocked after re-evaluation. Resolve the support or policy issues before resubmitting.");
  }
  return updated;
}
