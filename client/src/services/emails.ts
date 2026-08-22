import api from "./api.js";
import type {
  Email,
  ReplyRequest,
} from "../types/index.js";

export interface ApiEmail {
  id: string;
  _id?: string;
  subject: string;
  from: string;
  preview?: string;
  body?: string;
  receivedAt?: string;
  createdAt?: string;
  unread?: boolean;
  provider?: "gmail" | "outlook";
  status?: string;
}

export interface InboxResponse {
  emails: ApiEmail[];
  page: number;
  hasMore: boolean;
}

export interface SyncInboxResponse {
  synced: number;
  message?: string;
}

export async function getInbox(
  page = 1,
  limit = 20
): Promise<InboxResponse> {
  const response =
    await api.get<InboxResponse>("/emails", {
      params: {
        page,
        limit,
      },
    });

  return response.data;
}

export async function getEmail(
  id: string
): Promise<Email> {
  const response =
    await api.get<Email>(`/emails/${id}`);

  return response.data;
}

export async function generateReply(
  request: ReplyRequest
): Promise<{ reply: string }> {
  const response =
    await api.post<{ reply: string }>(
      `/emails/${request.email}/reply`,
      {
        tone: request.tone,
        length: request.length,
      }
    );

  return response.data;
}

export async function syncInbox(
  provider?: "gmail" | "outlook"
): Promise<SyncInboxResponse> {
  const response =
    await api.post<SyncInboxResponse>(
      "/emails/sync",
      provider ? { provider } : {}
    );

  return response.data;
}

export async function loadSampleEmails(): Promise<ApiEmail[]> {
  const response =
    await api.post<ApiEmail[]>(
      "/emails/sample"
    );

  return response.data;
}
