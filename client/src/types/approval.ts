import type { Draft } from "./draft.js";

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalPriority = "low" | "medium" | "high";

export interface Approval {
  id: string;
  draftId: string;
  emailId: string;
  requesterId: string;
  reviewerId: string;
  draft: Draft;
  reviewer?: string;
  requestedAt: string;
  reviewedAt?: string;
  status: ApprovalStatus;
  priority: ApprovalPriority;
  comment?: string;
}
