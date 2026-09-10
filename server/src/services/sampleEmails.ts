import {
  Types,
  type AnyBulkWriteOperation,
} from "mongoose";
import EmailModel, {
  type EmailDocument,
} from "../models/Email.js";

const sampleEmails = [
  {
    messageId: "sample-cancel-subscription",
    subject: "How do I cancel my subscription?",
    from: "Olivia Martinez <olivia.martinez@example.com>",
    preview: "Please tell me how I can cancel my subscription before the next billing date.",
    body: `Hello,

I would like to cancel my subscription before my next billing date.

Could you please explain the cancellation process? Also, will I continue to have access until the end of my current billing period?

Thank you,
Olivia`,
  },
  {
    messageId: "sample-refund-request",
    subject: "Request for a refund",
    from: "Sarah Johnson <sarah.johnson@example.com>",
    preview: "Hello, I would like to request a refund for my subscription.",
    body: `Hello,

I purchased the product 10 days ago and would like a refund.
Can you please let me know if I am eligible?

Thank you.`,
  },
];

function parseSender(from: string) {
  const match = from.match(/^\s*(.*?)\s*<([^<>@\s]+@[^<>@\s]+)>\s*$/);

  if (match) {
    return {
      senderName: match[1].trim(),
      senderEmail: match[2].trim(),
    };
  }

  return {
    senderName: "",
    senderEmail: from.trim(),
  };
}

export async function loadSampleEmails(userId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  const objectId = new Types.ObjectId(userId);

  const operations: AnyBulkWriteOperation<EmailDocument>[] =
    sampleEmails.map((email, index) => {
      const { senderName, senderEmail } = parseSender(email.from);

      return {
        updateOne: {
          filter: {
            userId: objectId,
            messageId: email.messageId,
          },
          update: {
            $set: {
              userId: objectId,
              provider: "sample" as const,
              messageId: email.messageId,
              messageIdHeader: "",
              references: [],
              threadId: null,
              subject: email.subject,
              from: email.from,
              senderName,
              senderEmail,
              preview: email.preview,
              body: email.body,
              isSample: true,
              unread: true,
              archived: false,
              receivedAt: new Date(
                Date.now() - index * 60 * 60 * 1000
              ),
            },
          },
          upsert: true,
        },
      };
    });

  await EmailModel.bulkWrite(operations);

  return EmailModel.find({
    userId: objectId,
    provider: "sample",
    isSample: true,
  }).sort({
    receivedAt: -1,
  });
}
