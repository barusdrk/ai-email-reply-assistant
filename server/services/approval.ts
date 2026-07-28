import { approvalRepository } from "../repositories/ApprovalRepository.js";
import { draftRepository } from "../repositories/DraftRepository.js";
import { notify } from "./notification.js";
import { audit } from "./audit.js";

export async function submitForApproval(
  draftId: string,
  requesterId: string,
  reviewerId: string
) {
  await draftRepository.update(draftId,{status:"pending"});

  return approvalRepository.create({
    draftId,
    requesterId,
    reviewerId,
    status:"pending",
    requestedAt:new Date(),
  });
}

export function pendingApprovals() {
  return approvalRepository.findPending();
}

export async function approve(
  approvalId:string,
  comment=""
) {
  const approval=await approvalRepository.update(
    approvalId,
    {
      status:"approved",
      comment,
      reviewedAt:new Date(),
    }
  );

  if(!approval) return null;

  await draftRepository.update(
    approval.draftId.toString(),
    {
      status:"approved",
      approvedBy:approval.reviewerId,
    }
  );

  await notify(
    approval.requesterId.toString(),
    "approval",
    "Draft approved",
    "Your draft has been approved.",
    approval.draftId.toString()
  );

  await audit(
    "approve",
    "draft",
    approval.draftId.toString(),
    approval.reviewerId.toString()
  );

  return approval;
}

export async function reject(
  approvalId:string,
  comment=""
) {
  const approval=await approvalRepository.update(
    approvalId,
    {
      status:"rejected",
      comment,
      reviewedAt:new Date(),
    }
  );

  if(!approval) return null;

  await draftRepository.update(
    approval.draftId.toString(),
    {
      status:"rejected",
    }
  );

  await notify(
    approval.requesterId.toString(),
    "approval",
    "Draft rejected",
    "Please revise the draft.",
    approval.draftId.toString()
  );

  await audit(
    "reject",
    "draft",
    approval.draftId.toString(),
    approval.reviewerId.toString()
  );

  return approval;
}
