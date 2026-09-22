export type EmailProvider = "gmail" | "outlook";

export interface NormalizedEmail {
  id: string;
  threadId: string;
  messageIdHeader: string;
  references: string[];
  subject: string;
  from: string;
  senderName: string;
  senderEmail: string;
  preview: string;
  body: string;
  unread: boolean;
  archived: boolean;
  receivedAt?: Date;
}
