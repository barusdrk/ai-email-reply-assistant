export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected";

export interface SubmitApprovalInput {
  draftId: string;
  requesterId: string;
  reviewerId: string;
}

export interface ApprovalDecisionInput {
  approvalId: string;
  comment?: string;
}
