import {draftRepository} from "../repositories/DraftRepository.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {sendEmail as sendGmailEmail} from "./gmail.js";
import {sendEmail as sendOutlookEmail} from "./outlook.js";

export async function sendDraft(id: string) {
  const draft = await draftRepository.findById(id);
  if (!draft) throw new Error("Draft not found.");
  if (draft.status === "sent") throw new Error("Draft has already been sent.");
  if (draft.status === "rejected") throw new Error("Rejected drafts cannot be sent.");
  if (draft.status === "escalated") throw new Error("Escalated drafts require human approval before sending.");

  const email = await emailRepository.findById(draft.emailId.toString());
  if (!email) throw new Error("Source email not found.");

  const recipient = email.senderEmail?.trim() || draft.customer.trim();
  if (!recipient) throw new Error("Customer email address is required.");

  if (draft.provider === "gmail") {
    await sendGmailEmail(draft.userId.toString(), {
      to: recipient,
      subject: draft.subject,
      reply: draft.reply,
      threadId: email.threadId || undefined,
      inReplyTo: email.messageIdHeader || undefined,
      references: email.references?.length ? email.references : undefined,
    });
  } else if (draft.provider === "outlook") {
    await sendOutlookEmail(draft.userId.toString(), {
      to: recipient,
      subject: draft.subject,
      reply: draft.reply,
      threadId: email.threadId || undefined,
      originalMessageId: email.messageId || email.messageIdHeader || undefined,
    });
  } else {
    throw new Error(`Unsupported draft provider: ${draft.provider}.`);
  }

  const sentAt = new Date();
  const updatedDraft = await draftRepository.update(id, {status: "sent", sentAt});
  if (!updatedDraft) throw new Error("Draft could not be updated after sending.");

  return updatedDraft;
}
