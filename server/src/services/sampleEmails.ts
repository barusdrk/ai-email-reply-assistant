import {
  Types,
  type AnyBulkWriteOperation,
} from "mongoose";
import EmailModel, {
  type Email,
} from "../models/Email.js";

const sampleEmails = [
  {
    messageId: "sample-refund-request",
    subject: "Request for a refund",
    from: "Sarah Johnson <sarah.johnson@example.com>",
    preview: "Hello, I would like to request a refund for my subscription.",
    body: `Hello,

I would like to request a refund for my subscription. I was charged yesterday, but I no longer need the service.

Could you please let me know if a refund is possible?

Thank you,
Sarah`,
  },
  {
    messageId: "sample-login-problem",
    subject: "I cannot log in to my account",
    from: "Michael Chen <michael.chen@example.com>",
    preview: "I have tried resetting my password but I still cannot access my account.",
    body: `Hello Support Team,

I cannot log in to my account. I have tried resetting my password several times, but I still cannot access the dashboard.

Can you please help me resolve this issue?

Best,
Michael`,
  },
  {
    messageId: "sample-billing-question",
    subject: "Question about my latest invoice",
    from: "Emma Williams <emma.williams@example.com>",
    preview: "Could you explain why my latest invoice is higher than expected?",
    body: `Hi,

I noticed that my latest invoice is higher than I expected. Could you please explain the additional charge?

I would appreciate it if you could review my account and let me know what happened.

Thanks,
Emma`,
  },
  {
    messageId: "sample-feature-request",
    subject: "Feature request: team collaboration",
    from: "Daniel Brown <daniel.brown@example.com>",
    preview: "It would be helpful if multiple team members could collaborate on replies.",
    body: `Hello,

I really enjoy using your product. One feature that would be extremely helpful is team collaboration.

It would be great if multiple team members could review and approve AI-generated replies before they are sent.

Is this something you are planning to add?

Regards,
Daniel`,
  },
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
];

export async function loadSampleEmails(
  userId: string
) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  const objectId = new Types.ObjectId(userId);

  const operations: AnyBulkWriteOperation<Email>[] =
    sampleEmails.map((email, index) => ({
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
            subject: email.subject,
            from: email.from,
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
    }));

  await EmailModel.bulkWrite(operations);

  return EmailModel.find({
    userId: objectId,
    provider: "sample",
    isSample: true,
  }).sort({
    receivedAt: -1,
  });
}
