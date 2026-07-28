import {
  getDraft,
} from "./drafts.js";

export function approveDraft(
  id: string
) {
  const draft = getDraft(id);

  if (!draft) {
    return undefined;
  }

  draft.status = "approved";

  return draft;
}

export function rejectDraft(
  id: string
) {
  const draft = getDraft(id);

  if (!draft) {
    return undefined;
  }

  draft.status = "rejected";

  return draft;
}

export function submitForApproval(
  id: string
) {
  const draft = getDraft(id);

  if (!draft) {
    return undefined;
  }

  draft.status = "pending";

  return draft;
}

export function markSent(
  id: string
) {
  const draft = getDraft(id);

  if (!draft) {
    return undefined;
  }

  draft.status = "sent";

  return draft;
}
