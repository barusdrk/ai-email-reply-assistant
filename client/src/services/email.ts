import API from "./api.js";

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

export async function generateReply(
  request: ReplyRequest
): Promise<ReplyResponse> {
  const { data } =
    await API.post<ReplyResponse>(
      "/reply",
      request
    );

  return data;
}

export async function getInbox() {
  const { data } =
    await API.get<Email[]>(
      "/emails"
    );

  return data;
}

export async function getEmail(
  id: string
) {
  const { data } =
    await API.get<Email>(
      `/emails/${id}`
    );

  return data;
}
