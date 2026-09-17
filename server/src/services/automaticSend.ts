import {Types} from "mongoose";
import {draftRepository} from "../repositories/DraftRepository.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {sendEmail as sendGmailEmail} from "./gmail.js";
import {sendEmail as sendOutlookEmail} from "./outlook.js";
import {notify} from "./notification.js";

export interface AutomaticSendResult {
  sent: boolean;
  provider: "gmail" | "outlook";
  draftId: string;
  emailId: string;
  sentAt: Date;
}

function getCustomerEmail(email:any,draft:any):string {
  const senderEmail=String(email?.senderEmail ?? "").trim();
  if(senderEmail)return senderEmail;
  return String(draft?.customer ?? "").trim();
}

export async function sendAutomatically(userId: string, draftId: string): Promise<AutomaticSendResult | null> {
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID.");
  if (!Types.ObjectId.isValid(draftId)) throw new Error("Invalid draft ID.");
  const existingDraft = await draftRepository.findById(draftId);
  if (!existingDraft) return null;
  if (String(existingDraft.userId) !== userId) throw new Error("Unauthorized.");
  if (existingDraft.status === "sent") throw new Error("Draft has already been sent.");
  if (existingDraft.status === "sending") throw new Error("Draft is already being sent.");
  if (existingDraft.status !== "approved" || existingDraft.automaticAction !== "auto_approve") {
    throw new Error("This draft is not approved for automatic sending.");
  }
  if (existingDraft.provider === "sample") throw new Error("Sample drafts cannot be sent automatically.");
  if (existingDraft.provider !== "gmail" && existingDraft.provider !== "outlook") {
    throw new Error(`Unsupported email provider: ${existingDraft.provider}.`);
  }
  const claimedDraft = await draftRepository.claimForAutomaticSend(draftId, userId);
  if (!claimedDraft) {
    const currentDraft = await draftRepository.findById(draftId);
    if (!currentDraft) return null;
    if (currentDraft.status === "sending") throw new Error("Draft is already being sent.");
    if (currentDraft.status === "sent") throw new Error("Draft has already been sent.");
    throw new Error("Draft is no longer available for automatic sending.");
  }

  const provider = claimedDraft.provider;
  if (provider !== "gmail" && provider !== "outlook") {
    await draftRepository.update(draftId, {status: "approved"});
    throw new Error(`Unsupported email provider: ${provider}.`);
  }

  const email = await emailRepository.findById(String(claimedDraft.emailId));
  if (!email) {
    await draftRepository.update(draftId, {status: "approved"});
    throw new Error("Original email not found.");
  }

  const recipient = getCustomerEmail(email, claimedDraft);
  if (!recipient) {
    await draftRepository.update(draftId, {status: "approved"});
    throw new Error("Customer email address is required for automatic sending.");
  }

  if (!claimedDraft.subject?.trim()) {
    await draftRepository.update(draftId, {status: "approved"});
    throw new Error("Draft subject is required.");
  }

  if (!claimedDraft.reply?.trim()) {
    await draftRepository.update(draftId, {status: "approved"});
    throw new Error("Draft reply is empty.");
  }

  try {
    if (provider === "gmail") {
      await sendGmailEmail(userId, {
        to: recipient,
        subject: claimedDraft.subject,
        reply: claimedDraft.reply,
        threadId: email.threadId,
        inReplyTo: email.messageIdHeader || undefined,
        references: email.references?.length ? email.references : undefined,
      });
    } else {
      await sendOutlookEmail(userId, {
        to: recipient,
        subject: claimedDraft.subject,
        reply: claimedDraft.reply,
        threadId: email.threadId,
        originalMessageId: email.messageId,
      });
    }
  } catch (error) {
    await draftRepository.update(draftId, {status: "approved"});
    throw error;
  }

  const sentAt = new Date();
  const updatedDraft = await draftRepository.update(draftId, {status: "sent", sentAt});
  if (!updatedDraft) throw new Error("Draft could not be updated after sending.");

  await emailRepository.update(String(email._id), {
    draftId: claimedDraft._id,
  });

  await notify(
    userId,
    "sent",
    "Reply sent",
    `The approved customer support reply was sent automatically to ${recipient}.`,
    draftId,
  );

  return {
    sent: true,
    provider,
    draftId,
    emailId: String(claimedDraft.emailId),
    sentAt,
  };
}
