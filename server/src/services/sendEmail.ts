import { google } from "googleapis";
import { Types } from "mongoose";
import ConnectedAccountModel from "../models/ConnectedAccount.js";
import UserModel from "../models/User.js";
import { env } from "../config/env.js";
import {
  replyToEmail as replyToOutlookEmail,
  sendEmail as sendOutlookEmail,
} from "./outlook.js";

export type Provider = "gmail" | "outlook" | "sample";

export interface SendEmailOptions {
  userId: string;
  provider: Provider;
  to: string;
  subject: string;
  reply: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string[];
  originalMessageId?: string;
}

function createGoogleClient() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_CALLBACK_URL
  );
}

function encodeBase64(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendGmailEmail(options: SendEmailOptions) {
  const account = await ConnectedAccountModel.findOne({
    userId: new Types.ObjectId(options.userId),
    provider: "gmail",
    connected: true,
  });

  if (!account?.accessToken) {
    throw new Error("Gmail account is not connected.");
  }

  const auth = createGoogleClient();

  auth.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken ?? undefined,
    expiry_date: account.expiresAt?.getTime(),
  });

  const gmail = google.gmail({ version: "v1", auth });

  const subject = options.subject.startsWith("Re:")
    ? options.subject
    : `Re: ${options.subject}`;

  const headers = [
    `To: ${options.to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=UTF-8",
  ];

  if (options.inReplyTo) {
    headers.push(`In-Reply-To: ${options.inReplyTo}`);
  }

  if (options.references?.length) {
    headers.push(`References: ${options.references.join(" ")}`);
  }

  const raw = [...headers, "", options.reply].join("\r\n");

  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodeBase64(raw),
      ...(options.threadId ? { threadId: options.threadId } : {}),
    },
  });

  return {
    id: result.data.id ?? "",
    threadId: result.data.threadId ?? options.threadId ?? "",
    provider: "gmail" as const,
    sent: true,
  };
}

async function sendOutlook(options: SendEmailOptions) {
  if (options.originalMessageId) {
    const result = await replyToOutlookEmail(
      options.userId,
      options.originalMessageId,
      options.reply
    );

    return {
      id: result.id,
      threadId: options.threadId ?? "",
      provider: "outlook" as const,
      sent: result.sent,
    };
  }

  const result = await sendOutlookEmail(options.userId, {
    to: options.to,
    subject: options.subject,
    reply: options.reply,
  });

  return {
    id: "",
    threadId: options.threadId ?? "",
    provider: "outlook" as const,
    sent: result.sent,
  };
}

async function resolveProvider(
  userId: string,
  provider: Provider
): Promise<"gmail" | "outlook"> {
  if (provider === "gmail" || provider === "outlook") {
    return provider;
  }

  const user = await UserModel.findById(userId)
    .select("activeEmailProvider")
    .lean();

  const activeProvider = user?.activeEmailProvider;

  if (activeProvider !== "gmail" && activeProvider !== "outlook") {
    throw new Error(
      "Select Gmail or Outlook as your active email provider."
    );
  }

  const account = await ConnectedAccountModel.findOne({
    userId: new Types.ObjectId(userId),
    provider: activeProvider,
    connected: true,
  });

  if (!account?.accessToken) {
    throw new Error(
      `${activeProvider === "gmail" ? "Gmail" : "Outlook"} account is not connected.`
    );
  }

  return activeProvider;
}

export async function sendEmail(options: SendEmailOptions) {
  if (!Types.ObjectId.isValid(options.userId)) {
    throw new Error("Invalid user ID.");
  }

  const to = options.to.trim();
  const subject = options.subject.trim();
  const reply = options.reply.trim();

  if (!to || !subject || !reply) {
    throw new Error("Recipient, subject, and reply are required.");
  }

  const provider = await resolveProvider(
    options.userId,
    options.provider
  );

  const resolvedOptions = {
    ...options,
    provider,
    to,
    subject,
    reply,
  };

  if (provider === "gmail") {
    return sendGmailEmail(resolvedOptions);
  }

  return sendOutlook(resolvedOptions);
}
