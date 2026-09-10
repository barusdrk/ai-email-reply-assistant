import { Types } from "mongoose";
import { approvalRepository } from "../repositories/ApprovalRepository.js";
import { draftRepository } from "../repositories/DraftRepository.js";
import { notify } from "./notification.js";
import { audit } from "./audit.js";
import { approveDraft, rejectDraft } from "./drafts.js";

export function approvals(userId: string) {
  return approvalRepository.findAll(userId);
}

export function approval(id: string) {
  return approvalRepository.findById(id);
}

export async function requestApproval(draftId: string, reviewerId: string) {
  if (!Types.ObjectId.isValid(draftId)) throw new Error("Invalid draft ID.");
  if (!Types.ObjectId.isValid(reviewerId)) throw new Error("Invalid reviewer ID.");

  const item = await approvalRepository.create({
    draftId: new Types.ObjectId(draftId),
    reviewerId: new Types.ObjectId(reviewerId),
    status: "pending",
  });

  await notify(reviewerId, "approval", "Approval requested", "A draft is awaiting review.", draftId);
  await audit("approval_requested", "draft", draftId, reviewerId);

  return item;
}

export async function approve(id: string, reviewerId: string) {
  if (!Types.ObjectId.isValid(id)) throw new Error("Invalid approval ID.");

  const item = await approvalRepository.findById(id);
  if (!item) return null;

  if (item.reviewerId.toString() !== reviewerId) {
    throw new Error("Unauthorized.");
  }

  if (item.status !== "pending") {
    throw new Error("Only pending approvals can be approved.");
  }

  await approveDraft(item.draftId.toString(), reviewerId);

  const updated = await approvalRepository.update(id, {
    status: "approved",
    reviewedAt: new Date(),
  });

  if (!updated) return null;

  await audit("approval_approved", "approval", id, reviewerId);

  return updated;
}

export async function reject(id: string, reviewerId: string, comment?: string) {
  if (!Types.ObjectId.isValid(id)) throw new Error("Invalid approval ID.");

  const item = await approvalRepository.findById(id);
  if (!item) return null;

  if (item.reviewerId.toString() !== reviewerId) {
    throw new Error("Unauthorized.");
  }

  if (item.status !== "pending") {
    throw new Error("Only pending approvals can be rejected.");
  }

  await rejectDraft(item.draftId.toString(), reviewerId, comment);

  const updated = await approvalRepository.update(id, {
    status: "rejected",
    comment,
    reviewedAt: new Date(),
  });

  if (!updated) return null;

  await audit("approval_rejected", "approval", id, reviewerId);

  return updated;
}

export async function deleteApproval(id: string) {
  const item = await approvalRepository.findById(id);
  if (!item) return null;

  await audit("approval_deleted", "approval", id, item.reviewerId.toString());

  return approvalRepository.delete(id);
}
