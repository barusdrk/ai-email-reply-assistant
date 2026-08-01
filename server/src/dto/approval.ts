export interface CreateApprovalInput {
  draftId: string;
  emailId: string;
  requesterId: string;
  reviewerId: string;
}

export interface UpdateApprovalInput {
  status?: "pending" | "approved" | "rejected";
  comment?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}
