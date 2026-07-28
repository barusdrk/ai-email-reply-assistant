import { approvalRepository } from "../repositories/ApprovalRepository.js";
import { draftRepository } from "../repositories/DraftRepository.js";
import { notify } from "./notification.js";
import { audit } from "./audit.js";

export function approvals(
  userId:string
){
  return approvalRepository.findAll(userId);
}

export function approval(
  id:string
){
  return approvalRepository.findById(id);
}

export async function requestApproval(
  draftId:string,
  reviewerId:string
){
  const approval=
    await approvalRepository.create({
      draftId,
      reviewerId,
      status:"pending",
    });

  await notify(
    reviewerId,
    "approval",
    "Approval requested",
    "A draft is awaiting review.",
    draftId
  );

  await audit(
    "approval_requested",
    "draft",
    draftId,
    reviewerId
  );

  return approval;
}

export async function approve(
  id:string
){
  const approval=
    await approvalRepository.update(
      id,
      {
        status:"approved",
        reviewedAt:new Date(),
      }
    );

  if(!approval){
    return null;
  }

  await draftRepository.update(
    approval.draftId.toString(),
    {
      status:"approved",
      approvedAt:new Date(),
    }
  );

  await audit(
    "approval_approved",
    "approval",
    id,
    approval.reviewerId.toString()
  );

  return approval;
}

export async function reject(
  id:string,
  comment?:string
){
  const approval=
    await approvalRepository.update(
      id,
      {
        status:"rejected",
        comment,
        reviewedAt:new Date(),
      }
    );

  if(!approval){
    return null;
  }

  await draftRepository.update(
    approval.draftId.toString(),
    {
      status:"rejected",
      rejectionReason:comment,
    }
  );

  await audit(
    "approval_rejected",
    "approval",
    id,
    approval.reviewerId.toString()
  );

  return approval;
}

export async function deleteApproval(
  id:string
){
  const approval=
    await approvalRepository.findById(id);

  if(!approval){
    return null;
  }

  await audit(
    "approval_deleted",
    "approval",
    id,
    approval.reviewerId.toString()
  );

  return approvalRepository.delete(id);
}
