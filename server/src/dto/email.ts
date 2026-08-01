import type { EmailProvider } from "../types/email.js";

export interface CreateEmailInput {
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
  priority?: string;
  category?: string;
  summary?: string;
  draftId?: string;
  receivedAt?: Date;
}

export interface UpdateEmailInput {
  unread?: boolean;
  priority?: string;
  category?: string;
  summary?: string;
  draftId?: string;
}
