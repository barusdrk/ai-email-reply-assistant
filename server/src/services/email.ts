import {Types} from "mongoose";
import EmailModel, {type EmailDocument} from "../models/Email.js";
import {listEmails as listGmailEmails, type InboxEmail as GmailInboxEmail} from "./gmail.js";
import {listEmails as listOutlookEmails, type InboxEmail as OutlookInboxEmail} from "./outlook.js";
import {sendEmail as sendProviderEmail} from "./sendEmail.js";

export type EmailProvider = "gmail" | "outlook" | "sample";
export interface InboxOptions {page?: number; limit?: number;}
export interface SendEmailInput {
  provider: EmailProvider;
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string[];
  originalMessageId?: string;
}
type ProviderInboxEmail = GmailInboxEmail | OutlookInboxEmail;

function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

function toStoredEmail(email: ProviderInboxEmail, userId: Types.ObjectId, provider: "gmail" | "outlook"): Partial<EmailDocument> {
  const gmailEmail = provider === "gmail" ? email as GmailInboxEmail : null;
  const from = email.from ?? "";
  const senderEmail = gmailEmail?.senderEmail ?? from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const senderName = gmailEmail?.senderName ?? (senderEmail ? from.replace(senderEmail, "").replace(/[<>]/g, "").trim() : "");
  return {
    userId,
    provider,
    messageId: email.id,
    messageIdHeader: gmailEmail?.messageIdHeader ?? "",
    references: gmailEmail?.references ?? [],
    threadId: email.threadId || "",
    subject: email.subject ?? "",
    from,
    senderName,
    senderEmail,
    preview: email.preview ?? "",
    body: email.body ?? "",
    isSample: false,
    unread: email.unread ?? false,
    archived: email.archived ?? false,
    receivedAt: email.receivedAt ?? new Date(),
  };
}

export async function inbox(userId: string, options: InboxOptions = {}) {
  if (!isValidObjectId(userId)) throw new Error("Invalid user ID.");
  const page = Math.max(1, Number(options.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(options.limit ?? 50)));
  const skip = (page - 1) * limit;
  const objectId = new Types.ObjectId(userId);
  const [emails, total] = await Promise.all([
    EmailModel.find({userId: objectId, archived: false}).sort({receivedAt: -1}).skip(skip).limit(limit).lean(),
    EmailModel.countDocuments({userId: objectId, archived: false}),
  ]);
  return {emails, total, page, limit, hasMore: skip + emails.length < total};
}

export async function email(id: string, userId: string) {
  if (!isValidObjectId(id) || !isValidObjectId(userId)) return null;
  return EmailModel.findOne({_id: new Types.ObjectId(id), userId: new Types.ObjectId(userId)}).lean();
}

export async function syncInbox(provider: "gmail" | "outlook", userId: string) {
  if (!isValidObjectId(userId)) throw new Error("Invalid user ID.");
  const objectId = new Types.ObjectId(userId);
  const emails: ProviderInboxEmail[] = provider === "gmail"
    ? await listGmailEmails(userId)
    : await listOutlookEmails(userId);

  if (emails.length === 0) return [];

  const operations: Parameters<typeof EmailModel.bulkWrite>[0] = emails.map((item) => {
    const data = toStoredEmail(item, objectId, provider);
    return {
      updateOne: {
        filter: {
          userId: objectId,
          provider,
          messageId: item.id,
        },
        update: {$set: data},
        upsert: true,
      },
    };
  });

  await EmailModel.bulkWrite(operations, {ordered: false});

  return EmailModel.find({
    userId: objectId,
    provider,
    messageId: {$in: emails.map((item) => item.id)},
  }).sort({receivedAt: -1}).lean();
}

export async function syncAllInboxes(userId: string) {
  const [gmailResult, outlookResult] = await Promise.allSettled([
    syncInbox("gmail", userId),
    syncInbox("outlook", userId),
  ]);
  const gmail = gmailResult.status === "fulfilled" ? gmailResult.value : [];
  const outlook = outlookResult.status === "fulfilled" ? outlookResult.value : [];
  const errors = [gmailResult, outlookResult]
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => result.reason instanceof Error ? result.reason.message : "Inbox sync failed.");
  return {gmail, outlook, errors};
}

export async function sendEmail(userId: string, input: SendEmailInput) {
  return sendProviderEmail({
    userId,
    provider: input.provider,
    to: input.to,
    subject: input.subject,
    reply: input.body,
    threadId: input.threadId,
    inReplyTo: input.inReplyTo,
    references: input.references,
    originalMessageId: input.originalMessageId,
  });
}
