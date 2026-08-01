import {
  getDraft,
} from "./drafts.js";

export async function approveDraft(
  id: string
) {
  const draft =
    await getDraft(id);

  if (!draft) {
    return undefined;
  }

  draft.status =
    "approved";

  return draft;
}

export async function rejectDraft(
  id: string
) {
  const draft =
    await getDraft(id);

  if (!draft) {
    return undefined;
  }

  draft.status =
    "rejected";

  return draft;
}

export async function submitForApproval(
  id: string
) {
  const draft =
    await getDraft(id);

  if (!draft) {
    return undefined;
  }

  draft.status =
    "pending";

  return draft;
}

export async function markSent(
  id: string
) {
  const draft =
    await getDraft(id);

  if (!draft) {
    return undefined;
  }

  draft.status =
    "sent";

  return draft;
}
