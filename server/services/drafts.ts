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
    "AI draft created",
    "A new AI reply is ready.",
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

  if(draft){
    await audit(
      "draft_updated",
      "draft",
      id,
      draft.userId.toString()
    );
  }

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
