export type DraftTone = "professional" | "friendly" | "formal" | "concise" | "empathetic" | "enthusiastic";
export type DraftLength = "short" | "medium" | "long";
export type DraftStatus = "pending" | "approved" | "rejected" | "sending" | "sent" | "escalated";
export type Provider = "gmail" | "outlook" | "sample";

export interface CreateDraftData {
  userId: string;
  emailId: string;
  provider: Provider;
  subject: string;
  customer: string;
  email?: string;
  reply?: string;
  tone?: DraftTone;
  length?: DraftLength;
}

export interface UpdateDraftData {
  reply?: string;
  tone?: DraftTone;
  length?: DraftLength;
  status?: DraftStatus;
}
