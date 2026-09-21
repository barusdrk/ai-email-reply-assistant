export type DraftProvider = "gmail" | "outlook";
export type DraftTone = "professional" | "friendly" | "formal" | "concise" | "empathetic" | "enthusiastic";
export type DraftLength = "short" | "medium" | "long";
export type DraftStatus = "pending" | "approved" | "rejected" | "sending" | "sent" | "escalated";
export type ConfidenceLevel = "high" | "medium" | "low";
export type AutomaticAction = "auto_approve" | "pending" | "escalate" | "blocked";
export type SupportCategory = "general_support" | "billing" | "technical" | "account" | "sales" | "refund" | "cancellation" | "shipping" | "complaint" | "other";
export type SupportSentiment = "positive" | "neutral" | "negative" | "urgent";
export type SupportDecision = "reply" | "human_review" | "reject";

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
  automaticAction?: AutomaticAction;
  automaticActionReasons?: string[];
  confidence?: DraftConfidence;
  supportCategory?: SupportCategory;
  supportSentiment?: SupportSentiment;
  supportConfidence?: number;
  supportDecision?: SupportDecision;
  supportNeedsHuman?: boolean;
  supportReason?: string;
  supportSuggestedActions?: string[];
  supportMissingInformation?: string[];
  supportPolicyIssues?: string[];
  escalatedAt?: string;
  escalationReason?: string;
  escalationReasons?: string[];
  approvedAt?: string;
  rejectionReason?: string;
  sentAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
