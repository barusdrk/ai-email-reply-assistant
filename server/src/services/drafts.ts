import { draftRepository } from "../repositories/DraftRepository.js";
import { notify } from "./notification.js";
import { audit } from "./audit.js";
import { generateReply } from "./openai.js";

export function drafts(
  userId:string
){
  return draftRepository.findAll(userId);
}

export function draft(
  id:string
){
  return draftRepository.findById(id);
}

export async function createDraft(
  data:{
    userId:string;
    emailId:string;
    subject:string;
    customer:string;
    email:string;
    tone?:
      "professional"|
      "friendly"|
      "formal"|
      "empathetic";
    length?:
      "short"|
      "medium"|
      "long";
  }
){
  const reply=
    await generateReply({
      email:data.email,
      tone:
        data.tone ??
        "professional",
      length:
        data.length ??
        "medium",
    });

  const draft=
    await draftRepository.create({
      userId:data.userId as any,
      emailId:data.emailId as any,
      subject:data.subject,
      customer:data.customer,
      reply,
      status:"pending",
      createdAt:new Date(),
    });

  await notify(
    data.userId,
    "draft",
    "Draft created",
    "A new AI reply is ready.",
    draft._id.toString()
  );

  await audit(
    "draft_created",
    "draft",
    draft._id.toString(),
    data.userId
  );

  return draft;
}

export async function updateDraft(
  id:string,
  data:any
){
  const draft=
    await draftRepository.update(
      id,
      data
    );

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

export async function approveDraft(
  id:string
){
  return draftRepository.update(
    id,
    {
      status:"approved",
      approvedAt:new Date(),
    }
  );
}

export async function rejectDraft(
  id:string,
  reason?:string
){
  return draftRepository.update(
    id,
    {
      status:"rejected",
      rejectionReason:
        reason,
    }
  );
}

export async function deleteDraft(
  id:string
){
  const draft=
    await draftRepository.findById(id);

  if(!draft){
    return null;
  }

  await audit(
    "draft_deleted",
    "draft",
    id,
    draft.userId.toString()
  );

  return draftRepository.delete(id);
}
