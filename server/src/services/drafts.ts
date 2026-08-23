import { draftRepository } from "../repositories/DraftRepository.js";
import { generateReply } from "./openai.js";
import { sendEmail } from "./sendEmail.js";

export type DraftTone =
  | "professional"
  | "friendly"
  | "formal"
  | "concise"
  | "empathetic"
  | "enthusiastic";

export type DraftLength =
  | "short"
  | "medium"
  | "long";

type DraftStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "sent";

type Provider =
  | "gmail"
  | "outlook";

interface CreateDraftData {
  userId: string;
  emailId: string;
  subject: string;
  customer: string;
  email: string;
  reply?: string;
  tone?: DraftTone;
  length?: DraftLength;
}

interface UpdateDraftData {
  reply?: string;
  tone?: DraftTone;
  length?: DraftLength;
  status?: DraftStatus;
}

export function drafts(userId: string) {
  return draftRepository.findAll(userId);
}

export function draft(id: string) {
  return draftRepository.findById(id);
}

export async function createDraft(data: CreateDraftData) {
  const tone = data.tone ?? "professional";
  const length = data.length ?? "medium";
  const reply = data.reply?.trim()
    ? data.reply.trim()
    : await generateReply({
        userId: data.userId,
        email: data.email,
        tone,
        length,
      });

  return draftRepository.create({
    userId: data.userId as any,
    emailId: data.emailId as any,
    subject: data.subject,
    customer: data.customer,
    reply,
    tone,
    length,
    status: "pending",
  });
}

export function updateDraft(
  id: string,
  data: UpdateDraftData
) {
  return draftRepository.update(id, data);
}

export function approveDraft(id: string) {
  return draftRepository.update(id, {
    status: "approved",
    approvedAt: new Date(),
  });
}

export function rejectDraft(id: string) {
  return draftRepository.update(id, {
    status: "rejected",
  });
}

export async function sendDraft(
  id: string,
  userId: string,
  provider: Provider
) {
  const savedDraft =
    await draftRepository.findById(id);

  if (!savedDraft) {
    throw new Error("Draft not found.");
  }

  if (savedDraft.userId.toString() !== userId) {
    throw new Error("Unauthorized.");
  }

  if (savedDraft.status === "sent") {
    throw new Error("Draft has already been sent.");
  }

  if (savedDraft.status === "rejected") {
    throw new Error("Rejected drafts cannot be sent.");
  }

  await sendEmail({
    userId,
    provider,
    to: savedDraft.customer,
    subject: savedDraft.subject,
    reply: savedDraft.reply,
  });

  return draftRepository.update(id, {
    status: "sent",
    sentAt: new Date(),
  });
}

export function deleteDraft(id: string) {
  return draftRepository.delete(id);
}

export async function submitDraft(
  id: string,
  userId: string
) {
  const savedDraft =
    await draftRepository.findById(id);

  if (!savedDraft) {
    return null;
  }

  if (
    savedDraft.userId.toString() !== userId
  ) {
    throw new Error("Unauthorized.");
  }

  if (savedDraft.status === "sent") {
    throw new Error(
      "Sent drafts cannot be submitted."
    );
  }

  return draftRepository.update(id, {
    status: "pending",
  });
}
