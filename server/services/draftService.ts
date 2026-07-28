import {
  draftRepository,
} from "../repositories/DraftRepository.js";

export const getDrafts = (userId: string) =>
  draftRepository.findAll(userId);

export const createDraft = (
  userId: string,
  emailId: string,
  reply: string
) =>
  draftRepository.create({
    userId,
    emailId,
    reply,
    tone: "professional",
    length: "medium",
    status: "draft",
  });

export function updateDraft(
  id: string,
  reply: string
) {
  return draftRepository.update(
    id,
    { reply }
  );
}

export function deleteDraft(
  id: string
) {
  return draftRepository.delete(id);
}

export function submitDraft(
  id: string
) {
  return draftRepository.update(id, {
    status: "pending",
  });
}
