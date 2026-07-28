import * as gmail from "./gmail.js";
import * as outlook from "./outlook.js";
import { emailRepository } from "../repositories/EmailRepository.js";
import { notify } from "./notification.js";
import { audit } from "./audit.js";

export async function syncInbox(
  provider:"gmail"|"outlook",
  userId:string
){
  const emails=
    provider==="gmail"
      ?await gmail.listEmails()
      :await outlook.listEmails();

  for(const email of emails){
    await emailRepository.create({
      userId,
      provider,
      messageId:email.id,
      threadId:email.threadId,
      from:
        email.from?.emailAddress?.address ??
        "",
      to:
        email.to ??
        "",
      subject:
        email.subject ??
        "",
      preview:
        email.snippet ??
        email.bodyPreview ??
        "",
      body:
        email.body ??
        "",
      unread:
        email.labelIds?.includes("UNREAD") ??
        !email.isRead,
      receivedAt:
        email.internalDate
          ?new Date(Number(email.internalDate))
          :new Date(
              email.receivedDateTime ??
              Date.now()
            ),
    });
  }

  await notify(
    userId,
    "email",
    "Inbox synchronized",
    `${emails.length} email(s) synchronized.`
  );

  await audit(
    "sync",
    "email",
    "",
    userId,
    {
      provider,
      count:emails.length,
    }
  );

  return emailRepository.findAll(userId);
}

export function inbox(userId:string){
  return emailRepository.findAll(userId);
}

export function email(id:string){
  return emailRepository.findById(id);
}

export function removeEmail(id:string){
  return emailRepository.delete(id);
}
