export type DraftStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "sent";

export interface Draft {
  id: string;
  emailId: string;
  subject: string;
  customer?: string;
  reply: string;
  status: DraftStatus;
  tone?:
    | "professional"
    | "friendly"
    | "formal"
    | "empathetic";
  approvedAt?: string;
  rejectionReason?: string;
  sentAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
