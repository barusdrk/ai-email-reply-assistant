export type DraftStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "sent";

export interface Draft {
  id: string;
  emailId: string;
  customer: string;
  subject: string;
  reply: string;
  createdAt: string;
  status: DraftStatus;
}

const drafts: Draft[] = [];

export function getDrafts(): Draft[] {
  return drafts;
}

export function getDraft(id: string) {
  return drafts.find((draft) => draft.id === id);
}

export function createDraft(
  draft: Omit<Draft, "id">
): Draft {
  const newDraft: Draft = {
    id: crypto.randomUUID(),
    ...draft,
  };

  drafts.push(newDraft);

  return newDraft;
}

export function updateDraft(
  id: string,
  reply: string
) {
  const draft = getDraft(id);

  if (!draft) {
    return undefined;
  }

  draft.reply = reply;

  return draft;
}

export function deleteDraft(id: string) {
  const index = drafts.findIndex(
    (draft) => draft.id === id
  );

  if (index === -1) {
    return false;
  }

  drafts.splice(index, 1);

  return true;
}
