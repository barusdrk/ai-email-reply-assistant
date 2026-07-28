import { draftRepository } from "../repositories/DraftRepository.js";
import { notify } from "./notification.js";
import { audit } from "./audit.js";

export function drafts(userId:string){
  return draftRepository.findAll(userId);
}

export function draft(id:string){
  return draftRepository.findById(id);
}

export async function createDraft(data:any){
  const draft=
    await draftRepository.create(data);

  await notify(
    draft.userId.toString(),
    "draft",
    "AI draft ready",
    "A new AI reply has been generated.",
    draft._id.toString()
  );

  await audit(
    "draft_created",
    "draft",
    draft._id.toString(),
    draft.userId.toString()
  );

  return draft;
}

export async function updateDraft(
  id:string,
  data:any
){
  const draft=
    await draftRepository.update(id,data);

  if(!draft) return null;

  await audit(
    "draft_updated",
    "draft",
    id,
    draft.userId.toString()
  );

  return draft;
}

export async function approveDraft(
  id:string
){
  const draft=
    await draftRepository.update(
      id,
      {
        status:"approved",
        approvedAt:new Date(),
      }
    );

  if(!draft) return null;

  await notify(
    draft.userId.toString(),
    "approval",
    "Draft approved",
    "Draft is ready to send.",
    id
  );

  return draft;
}

export async function rejectDraft(
  id:string,
  reason?:string
){
  const draft=
    await draftRepository.update(
      id,
      {
        status:"rejected",
        rejectionReason:reason,
      }
    );

  if(!draft) return null;

  await notify(
    draft.userId.toString(),
    "approval",
    "Draft rejected",
    reason ?? "Draft requires changes.",
    id
  );

  return draft;
}

export async function deleteDraft(
  id:string
){
  await audit(
    "draft_deleted",
    "draft",
    id
  );

  return draftRepository.delete(id);
}
