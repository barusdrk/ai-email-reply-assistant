export type EmailProvider =
  | "gmail"
  | "outlook";

export type EmailPriority =
  | "low"
  | "medium"
  | "high";

export interface EmailRecord {
  id?: string;
  userId: string;
  provider: EmailProvider;
  messageId: string;
  threadId?: string;
  from: string;
  to?: string;
  subject: string;
  preview: string;
  body: string;
  unread: boolean;
  priority: EmailPriority;
  category?: string;
  summary?: string;
  draftId?: string;
  receivedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SyncInboxInput {
  userId: string;
  provider: EmailProvider;
}

export interface GenerateReplyInput {
  emailId: string;
  tone: string;
  length: string;
}
