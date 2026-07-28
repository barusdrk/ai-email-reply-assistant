export type DraftStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "sent";

export interface Draft {
  id: string;

  emailId: string;

  customer: string;

  subject: string;

  reply: string;

  createdAt: string;

  updatedAt?: string;

  status: DraftStatus;
}
