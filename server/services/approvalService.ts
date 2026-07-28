import {
  approvalRepository,
} from "../repositories/ApprovalRepository.js";

import {
  draftRepository,
} from "../repositories/DraftRepository.js";

export function getPendingApprovals() {
  return approvalRepository.findPending();
}

export async function approveDraft(
  id: string
) {
  const draft =
    await draftRepository.findById(id);

  if (!draft) return null;

  return draftRepository.update(id, {
    status: "approved",
  });
}

export async function rejectDraft(
  id: string
) {
  const draft =
    await draftRepository.findById(id);

  if (!draft) return null;

  return draftRepository.update(id, {
    status: "rejected",
  });
}
