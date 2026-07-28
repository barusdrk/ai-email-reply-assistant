export type Tone =
  | "professional"
  | "friendly"
  | "empathetic"
  | "formal"
  | "concise";

export type ReplyLength =
  | "short"
  | "medium"
  | "long";

export interface Email {
  id: string;

  from: string;

  to?: string;

  subject: string;

  body: string;

  preview?: string;

  receivedAt: string;

  unread: boolean;

  labels?: string[];

  attachments?: number;
}

export interface ReplyRequest {
  email: string;

  tone: Tone;

  length: ReplyLength;

  signature: string;
}

export interface ReplyResponse {
  reply: string;
}
