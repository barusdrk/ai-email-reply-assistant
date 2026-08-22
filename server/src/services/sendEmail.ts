import { google } from "googleapis";
import { Types } from "mongoose";
import ConnectedAccountModel from "../models/ConnectedAccount.js";
import { env } from "../config/env.js";

export type Provider =
  | "gmail"
  | "outlook";

export interface SendEmailOptions {
  userId: string;
  provider: Provider;
  to: string;
  subject: string;
  reply: string;
  threadId?: string;
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

async function sendGmailEmail(
  options: SendEmailOptions
) {
  const account =
    await ConnectedAccountModel.findOne({
      userId: new Types.ObjectId(options.userId),
      provider: "gmail",
    });

  if (!account) {
    throw new Error("Gmail account is not connected.");
  }

  const auth = createGoogleClient();

  auth.setCredentials({
    access_token:
      account.accessToken ?? undefined,
    refresh_token:
      account.refreshToken ?? undefined,
    expiry_date:
      account.expiresAt?.getTime(),
  });

  const gmail = google.gmail({
    version: "v1",
    auth,
  });

  const raw = [
    `To: ${options.to}`,
    `Subject: Re: ${options.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    options.reply,
  ].join("\r\n");

  const result =
    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodeBase64(raw),
        ...(options.threadId
          ? {
              threadId: options.threadId,
            }
          : {}),
      },
    });

  return {
    id: result.data.id ?? "",
    provider: "gmail" as const,
  };
}

async function sendOutlookEmail(
  options: SendEmailOptions
) {
  const account =
    await ConnectedAccountModel.findOne({
      userId: new Types.ObjectId(options.userId),
      provider: "outlook",
    });

  if (!account?.accessToken) {
    throw new Error(
      "Outlook account is not connected."
    );
  }

  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me/sendMail",
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${account.accessToken}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        message: {
          subject:
            `Re: ${options.subject}`,
          body: {
            contentType: "Text",
            content: options.reply,
          },
          toRecipients: [
            {
              emailAddress: {
                address: options.to,
              },
            },
          ],
        },
        saveToSentItems: true,
      }),
    }
  );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Microsoft Graph send failed: ${response.status} ${text}`
    );
  }

  return {
    id: "",
    provider: "outlook" as const,
  };
}

export async function sendEmail(
  options: SendEmailOptions
) {
  if (
    !Types.ObjectId.isValid(options.userId)
  ) {
    throw new Error("Invalid user ID.");
  }

  if (
    !options.to.trim() ||
    !options.subject.trim() ||
    !options.reply.trim()
  ) {
    throw new Error(
      "Recipient, subject, and reply are required."
    );
  }

  if (options.provider === "gmail") {
    return sendGmailEmail(options);
  }

  return sendOutlookEmail(options);
}
