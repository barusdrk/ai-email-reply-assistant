import { Types } from "mongoose";
import { emailRepository } from "../repositories/EmailRepository.js";
import * as gmail from "./gmail.js";
import * as outlook from "./outlook.js";
import { notify } from "./notification.js";

export async function syncInbox(
  provider: "gmail" | "outlook",
  userId: string
) {
  const emails =
    provider === "gmail"
      ? await gmail.listEmails()
      : await outlook.listEmails();

  for (const email of emails) {
    await emailRepository.upsert(
      email.id,
      {
        userId:
          new Types.ObjectId(userId),
        provider,
        messageId: email.id,
        threadId:
          email.threadId,
        subject:
          email.subject,
        from:
          email.from,
        preview:
          email.preview,
        body:
          email.body,
      }
    );
  }

  await notify(
    userId,
    "email",
    "Inbox synchronized",
    `${emails.length} email(s) synchronized.`
  );

  return emailRepository.findAll(userId);
}

export function inbox(
  userId: string
) {
  return emailRepository.findAll(userId);
}

export function email(
  id: string
) {
  return emailRepository.findById(id);
}

export function removeEmail(
  id: string
) {
  return emailRepository.delete(id);
}
