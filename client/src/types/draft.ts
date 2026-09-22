export type DraftProvider = "gmail" | "outlook";
export type DraftTone = "professional" | "friendly" | "formal" | "concise" | "empathetic" | "enthusiastic";
export type DraftLength = "short" | "medium" | "long";
export type DraftStatus = "pending" | "approved" | "rejected" | "sent" | "escalated";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface DraftConfidence {
  score: number;
  level: ConfidenceLevel;
  reasons: string[];
}

export interface Draft {
  id: string;
  _id?: string;
  userId?: string;
  emailId: string;
  provider: DraftProvider;
  subject: string;
  customer: string;
  reply: string;
  tone: DraftTone;
  length: DraftLength;
  status: DraftStatus;
  confidence?: DraftConfidence;
  escalatedAt?: string;
  escalationReason?: string;
  escalationReasons?: string[];
  approvedAt?: string;
  rejectionReason?: string;
  sentAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
