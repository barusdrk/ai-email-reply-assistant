import * as gmail from "./gmail.js";
import * as outlook from "./outlook.js";
import { emailRepository } from "../repositories/EmailRepository.js";
import { draftRepository } from "../repositories/DraftRepository.js";
import { notify } from "./notification.js";
import { audit } from "./audit.js";

export function inbox(userId:string){
  return emailRepository.findAll(userId);
}

export function email(id:string){
  return emailRepository.findById(id);
}

export async function syncInbox(
  provider:"gmail"|"outlook",
  userId:string
){
  const emails=
    provider==="gmail"
      ?await gmail.listEmails()
      :await outlook.listEmails();

  for(const item of emails){
    await emailRepository.upsert({
      userId,
      provider,
      messageId:item.id,
      threadId:item.threadId,
      from:
        item.from?.emailAddress?.address ??
        item.from ??
        "",
      to:item.to ?? "",
      subject:item.subject ?? "",
      preview:
        item.snippet ??
        item.bodyPreview ??
        "",
      body:item.body ?? "",
      unread:
        item.labelIds?.includes("UNREAD") ??
        !item.isRead,
      receivedAt:
        item.internalDate
          ?new Date(Number(item.internalDate))
          :new Date(
              item.receivedDateTime ??
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
    "email_sync",
    "email",
    "",
    userId,
    {
      provider,
      count:emails.length,
    }
  );

  return inbox(userId);
}

export async function markRead(
  id:string
){
  return emailRepository.update(
    id,
    {
      unread:false,
    }
  );
}

export async function archiveEmail(
  id:string
){
  return emailRepository.update(
    id,
    {
      archived:true,
    }
  );
}

export async function attachDraft(
  emailId:string,
  draftId:string
){
  await emailRepository.update(
    emailId,
    {
      draftId,
    }
  );

  return draftRepository.findById(
    draftId
  );
}

export function removeEmail(
  id:string
){
  return emailRepository.delete(id);
}
