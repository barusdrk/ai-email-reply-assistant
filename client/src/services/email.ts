import API from "./api.js";

import type {
  Email,
  Draft,
  ReplyRequest,
  ReplyResponse,
} from "../types.js";

export async function getInbox(): Promise<Email[]> {
  const { data } =
    await API.get<Email[]>(
      "/emails"
    );

  return data;
}

export async function getEmail(
  id: string
): Promise<Email> {
  const { data } =
    await API.get<Email>(
      `/emails/${id}`
    );

  return data;
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

export async function saveDraft(
  emailId: string,
  reply: string
): Promise<Draft> {
  const { data } =
    await API.post<Draft>(
      "/drafts",
      {
        emailId,
        reply,
      }
    );

  return data;
}

export async function updateDraft(
  draftId: string,
  reply: string
): Promise<Draft> {
  const { data } =
    await API.put<Draft>(
      `/drafts/${draftId}`,
      {
        reply,
      }
    );

  return data;
}

export async function deleteDraft(
  draftId: string
): Promise<void> {
  await API.delete(
    `/drafts/${draftId}`
  );
}

export async function getDrafts(): Promise<Draft[]> {
  const { data } =
    await API.get<Draft[]>(
      "/drafts"
    );

  return data;
}

export async function submitForApproval(
  draftId: string
): Promise<Draft> {
  const { data } =
    await API.post<Draft>(
      `/drafts/${draftId}/submit`
    );

  return data;
}

export async function approveDraft(
  draftId: string
): Promise<Draft> {
  const { data } =
    await API.post<Draft>(
      `/drafts/${draftId}/approve`
    );

  return data;
}

export async function rejectDraft(
  draftId: string
): Promise<Draft> {
  const { data } =
    await API.post<Draft>(
      `/drafts/${draftId}/reject`
    );

  return data;
}

export async function sendEmail(
  draftId: string
): Promise<Draft> {
  const { data } =
    await API.post<Draft>(
      `/emails/send/${draftId}`
    );

  return data;
}

export async function getSentEmails(): Promise<Draft[]> {
  const { data } =
    await API.get<Draft[]>(
      "/emails/sent"
    );

  return data;
}

export function connectGmail() {
  window.location.href =
    `${
      import.meta.env.VITE_API_URL ??
      "http://localhost:3001/api"
    }/gmail/login`;
}

export function connectOutlook() {
  window.location.href =
    `${
      import.meta.env.VITE_API_URL ??
      "http://localhost:3001/api"
    }/outlook/login`;
}
