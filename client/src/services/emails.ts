import API from "./api.js";
import type { ReplyTone } from "../types/settings.js";
import type { ReplyLengthValue } from "../components/LengthSelector.js";

export type EmailProvider = "gmail" | "outlook" | "sample";
export type SendEmailProvider = EmailProvider;

export interface ApiEmail {
  _id?: string;
  id?: string;
  provider: EmailProvider;
  threadId?: string;
  subject?: string;
  from?: string;
  senderName?: string;
  senderEmail?: string;
  preview?: string;
  body?: string;
  receivedAt?: string | Date;
  createdAt?: string | Date;
  unread?: boolean;
}

export interface InboxResponse {
  emails: ApiEmail[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface EmailResponse {
  email: ApiEmail;
}

export interface GenerateReplyInput {
  email: string;
  tone?: ReplyTone;
  length?: ReplyLengthValue;
}

export interface GenerateReplyResponse {
  reply: string;
}

export interface SendEmailInput {
  provider: SendEmailProvider;
  to: string;
  subject: string;
  body: string;
  emailId: string;
  threadId?: string;
  originalMessageId?: string;
}

export interface SendEmailResponse {
  provider: "gmail" | "outlook";
  id?: string;
  messageId?: string;
  threadId?: string;
  sent: boolean;
  policyCheck?: {
    compliant: boolean;
    score: number;
    violations: string[];
    warnings: string[];
    suggestions: string[];
  };
}

export async function getInbox(page = 1, limit = 50): Promise<InboxResponse> {
  const { data } = await API.get<InboxResponse>("/emails", {
    params: { page, limit },
  });
  return data;
}

export async function getEmail(id: string): Promise<ApiEmail> {
  const { data } = await API.get<EmailResponse>(`/emails/${id}`);
  return data.email;
}

export async function syncInbox(): Promise<unknown> {
  const { data } = await API.post("/emails/sync");
  return data;
}

export async function loadSampleEmails(): Promise<unknown> {
  const { data } = await API.post("/emails/sample");
  return data;
}

export async function generateReply(input: GenerateReplyInput): Promise<GenerateReplyResponse> {
  const { data } = await API.post<GenerateReplyResponse>("/reply", input);
  return data;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResponse> {
  const { data } = await API.post<SendEmailResponse>("/emails/send", input);
  return data;
}
