import { Types } from "mongoose";
import EmailModel from "../models/Email.js";
import {
  listEmails as listGmailEmails,
  type InboxEmail,
} from "./gmail.js";
import {
  listEmails as listOutlookEmails,
} from "./outlook.js";

export type EmailProvider =
  | "gmail"
  | "outlook"
  | "sample";

export interface InboxOptions {
  page?: number;
  limit?: number;
}

export async function inbox(
  userId: string,
  options: InboxOptions = {}
) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  const page = Math.max(
    1,
    Number(options.page ?? 1)
  );
  const limit = Math.min(
    100,
    Math.max(
      1,
      Number(options.limit ?? 50)
    )
  );
  const skip = (page - 1) * limit;
  const objectId = new Types.ObjectId(userId);

  const [emails, total] = await Promise.all([
    EmailModel.find({
      userId: objectId,
      archived: false,
    })
      .sort({ receivedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    EmailModel.countDocuments({
      userId: objectId,
      archived: false,
    }),
  ]);

  return {
    emails,
    total,
    page,
    limit,
    hasMore: skip + emails.length < total,
  };
}

export async function email(
  id: string,
  userId: string
) {
  if (
    !Types.ObjectId.isValid(id) ||
    !Types.ObjectId.isValid(userId)
  ) {
    return null;
  }

  return EmailModel.findOne({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId),
  }).lean();
}

function toStoredEmail(
  email: InboxEmail,
  userId: Types.ObjectId,
  provider: "gmail" | "outlook"
) {
  return {
    userId,
    provider,
    messageId: email.id,
    threadId: email.threadId || null,
    subject: email.subject,
    from: email.from,
    preview: email.preview,
    body: email.body,
    isSample: false,
    unread: true,
    archived: false,
    receivedAt: new Date(),
  };
}

export async function syncInbox(
  provider: "gmail" | "outlook",
  userId: string
) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  const objectId = new Types.ObjectId(userId);

  const emails =
    provider === "gmail"
      ? await listGmailEmails(userId)
      : await listOutlookEmails(userId);

  if (emails.length === 0) {
    return [];
  }

  const operations = emails.map((item) => ({
    updateOne: {
      filter: {
        userId: objectId,
        provider,
        messageId: item.id,
      },
      update: {
        $set: toStoredEmail(
          item,
          objectId,
          provider
        ),
      },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await EmailModel.bulkWrite(
      operations,
      {
        ordered: false,
      }
    );
  }

  return EmailModel.find({
    userId: objectId,
    provider,
    messageId: {
      $in: emails.map((item) => item.id),
    },
  })
    .sort({ receivedAt: -1 })
    .lean();
}

export async function syncAllInboxes(
  userId: string
) {
  const [gmailResult, outlookResult] =
    await Promise.allSettled([
      syncInbox("gmail", userId),
      syncInbox("outlook", userId),
    ]);

  const gmail =
    gmailResult.status === "fulfilled"
      ? gmailResult.value
      : [];

  const outlook =
    outlookResult.status === "fulfilled"
      ? outlookResult.value
      : [];

  const errors = [
    gmailResult,
    outlookResult,
  ]
    .filter(
      (
        result
      ): result is PromiseRejectedResult =>
        result.status === "rejected"
    )
    .map((result) =>
      result.reason instanceof Error
        ? result.reason.message
        : "Inbox sync failed."
    );

  return {
    gmail,
    outlook,
    errors,
  };
}
