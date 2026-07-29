export type Tone =
  | "professional"
  | "friendly"
  | "formal"
  | "empathetic"
  | "concise"
  | "enthusiastic";

export type ReplyLength =
  | "short"
  | "medium"
  | "long";

export interface Email {
  id: string;
  userId: string;
  provider:
    | "gmail"
    | "outlook";
  messageId: string;
  threadId?: string;
  subject: string;
  customer: string;
  preview?: string;
  body?: string;
  unread?: boolean;
  receivedAt?: string;
}

export interface ReplyRequest {
  email: string;
  tone?: Tone;
  length?: ReplyLength;
  signature?: string;
}

export interface ReplyResponse {
  reply: string;
}
