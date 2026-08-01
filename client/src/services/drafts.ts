import api from "./api.js";

import type {
  Draft,
} from "../types/draft.js";

export async function getDrafts() {
  const response =
    await api.get<Draft[]>(
      "/drafts"
    );

  return response.data;
}

export async function getDraft(
  id:string
) {
  const response =
    await api.get<Draft>(
      `/drafts/${id}`
    );

  return response.data;
}

export async function createDraft(
  draft:Omit<Draft, "id">
) {
  const response =
    await api.post<Draft>(
      "/drafts",
      draft
    );

  return response.data;
}

export async function updateDraft(
  id:string,
  reply:string
) {
  const response =
    await api.put<Draft>(
      `/drafts/${id}`,
      {
        reply,
      }
    );

  return response.data;
}

export async function deleteDraft(
  id:string
) {
  await api.delete(
    `/drafts/${id}`
  );
}

export async function submitForApproval(
  id:string
) {
  const response =
    await api.post<Draft>(
      `/drafts/${id}/submit`
    );

  return response.data;
}

export async function approveDraft(
  id:string
) {
  const response =
    await api.post<Draft>(
      `/drafts/${id}/approve`
    );

  return response.data;
}

export async function rejectDraft(
  id:string
) {
  const response =
    await api.post<Draft>(
      `/drafts/${id}/reject`
    );

  return response.data;
}
