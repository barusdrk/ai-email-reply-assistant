import { google } from "googleapis";
import { Types } from "mongoose";
import { env } from "../config/env.js";
import ConnectedAccountModel from "../models/ConnectedAccount.js";
import { htmlToText } from "../utils/emailBody.js";

export interface InboxEmail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  preview: string;
  body: string;
  receivedAt?: Date;
}

export interface GoogleOAuthTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  token_type?: string | null;
  scope?: string | null;
}

function createOAuthClient() {
  console.log(
    "Google OAuth callback:",
    env.GOOGLE_CALLBACK_URL
  );
  
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_CALLBACK_URL
  );
}

function getUserObjectId(userId: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }
  return new Types.ObjectId(userId);
}

export function getGoogleAuthUrl(userId: string): string {
  const oauth = createOAuthClient();

  return oauth.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent",
    state: getUserObjectId(userId).toString(),
  });
}

export async function exchangeCode(
  code: string,
  state: string
): Promise<GoogleOAuthTokens> {
  const userObjectId = getUserObjectId(state);
  const oauth = createOAuthClient();
  const { tokens } = await oauth.getToken(code);

  if (!tokens.access_token && !tokens.refresh_token) {
    throw new Error("Google did not return OAuth tokens.");
  }

  const existing = await ConnectedAccountModel.findOne({
    userId: userObjectId,
    provider: "gmail",
  });

  await ConnectedAccountModel.findOneAndUpdate(
    {
      userId: userObjectId,
      provider: "gmail",
    },
    {
      userId: userObjectId,
      provider: "gmail",
      accessToken:
        tokens.access_token ??
        existing?.accessToken,
      refreshToken:
        tokens.refresh_token ??
        existing?.refreshToken,
      expiresAt: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : existing?.expiresAt,
      connectedAt: new Date(),
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
    token_type: tokens.token_type,
    scope: tokens.scope,
  };
}

export async function connectionStatus(
  userId: string
): Promise<boolean> {
  const account = await ConnectedAccountModel.findOne({
    userId: getUserObjectId(userId),
    provider: "gmail",
  });

  return Boolean(
    account?.refreshToken ||
    account?.accessToken
  );
}

export async function disconnectAccount(
  userId: string
): Promise<boolean> {
  const account = await ConnectedAccountModel.findOne({
    userId: getUserObjectId(userId),
    provider: "gmail",
  });

  if (!account) {
    return false;
  }

  const oauth = createOAuthClient();

  if (account.accessToken) {
    oauth.setCredentials({
      access_token: account.accessToken,
      refresh_token:
        account.refreshToken ??
        undefined,
    });

    try {
      await oauth.revokeCredentials();
    } catch {}
  }

  await ConnectedAccountModel.deleteOne({
    _id: account._id,
  });

  return true;
}

async function getGmailClient(userId: string) {
  const account = await ConnectedAccountModel.findOne({
    userId: getUserObjectId(userId),
    provider: "gmail",
  });

  if (!account) {
    throw new Error(
      "Gmail account is not connected."
    );
  }

  const oauth = createOAuthClient();

  oauth.setCredentials({
    access_token:
      account.accessToken ??
      undefined,
    refresh_token:
      account.refreshToken ??
      undefined,
    expiry_date:
      account.expiresAt?.getTime(),
  });

  return google.gmail({
    version: "v1",
    auth: oauth,
  });
}

function decodeBase64(data: string): string {
  return Buffer.from(
    data
      .replace(/-/g, "+")
      .replace(/_/g, "/"),
    "base64"
  ).toString("utf8");
}

function getMessageBody(payload: any): string {
  if (!payload) {
    return "";
  }

  if (
    payload.mimeType === "text/plain" &&
    payload.body?.data
  ) {
    return decodeBase64(
      payload.body.data
    );
  }

  if (
    payload.mimeType === "text/html" &&
    payload.body?.data
  ) {
    return htmlToText(
      decodeBase64(
        payload.body.data
      )
    );
  }

  const parts =
    payload.parts ?? [];

  for (const part of parts) {
    if (
      part.mimeType === "text/plain" &&
      part.body?.data
    ) {
      return decodeBase64(
        part.body.data
      );
    }
  }

  for (const part of parts) {
    if (
      part.mimeType === "text/html" &&
      part.body?.data
    ) {
      return htmlToText(
        decodeBase64(
          part.body.data
        )
      );
    }
  }

  for (const part of parts) {
    const body =
      getMessageBody(part);

    if (body) {
      return body;
    }
  }

  return "";
}

async function getEmailDetails(
  gmail: ReturnType<
    typeof google.gmail
  >,
  messageId: string
): Promise<InboxEmail | null> {
  const full =
    await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

  const headers =
    full.data.payload?.headers ??
    [];

  const subject =
    headers.find(
      (header) =>
        header.name?.toLowerCase() ===
        "subject"
    )?.value ?? "";

  const from =
    headers.find(
      (header) =>
        header.name?.toLowerCase() ===
        "from"
    )?.value ?? "";

  const dateHeader =
    headers.find(
      (header) =>
        header.name?.toLowerCase() ===
        "date"
    )?.value;

  const receivedAt =
    dateHeader
      ? new Date(dateHeader)
      : full.data.internalDate
        ? new Date(
            Number(
              full.data.internalDate
            )
          )
        : new Date();

  return {
    id:
      full.data.id ??
      messageId,
    threadId:
      full.data.threadId ??
      "",
    subject,
    from,
    preview:
      full.data.snippet ??
      "",
    body:
      getMessageBody(
        full.data.payload
      ),
    receivedAt:
      Number.isNaN(
        receivedAt.getTime()
      )
        ? new Date()
        : receivedAt,
  };
}

async function getEmailDetailsBatch(
  gmail: ReturnType<
    typeof google.gmail
  >,
  messageIds: string[],
  concurrency = 10
): Promise<InboxEmail[]> {
  const emails: InboxEmail[] = [];

  for (
    let index = 0;
    index < messageIds.length;
    index += concurrency
  ) {
    const batch =
      messageIds.slice(
        index,
        index + concurrency
      );

    const results =
      await Promise.all(
        batch.map(
          async (messageId) => {
            try {
              return await getEmailDetails(
                gmail,
                messageId
              );
            } catch (error) {
              console.error(
                `Failed to fetch Gmail message ${messageId}:`,
                error
              );
              return null;
            }
          }
        )
      );

    emails.push(
      ...results.filter(
        (
          email
        ): email is InboxEmail =>
          email !== null
      )
    );
  }

  return emails;
}

export async function listEmails(
  userId: string,
  maxResults = 100
): Promise<InboxEmail[]> {
  const gmail =
    await getGmailClient(
      userId
    );

  const pageSize =
    Math.min(
      100,
      Math.max(
        1,
        maxResults
      )
    );

  const { data } =
    await gmail.users.messages.list({
      userId: "me",
      maxResults:
        pageSize,
      labelIds: ["INBOX"],
    });

  const messageIds =
    (data.messages ?? [])
      .map(
        (message) =>
          message.id
      )
      .filter(
        (
          id
        ): id is string =>
          Boolean(id)
      )
      .slice(
        0,
        maxResults
      );

  if (
    messageIds.length === 0
  ) {
    return [];
  }

  const emails =
    await getEmailDetailsBatch(
      gmail,
      messageIds,
      10
    );

  return emails.sort(
    (a, b) =>
      (b.receivedAt?.getTime() ??
        0) -
      (a.receivedAt?.getTime() ??
        0)
  );
}

function encodeBase64Url(
  value: string
): string {
  return Buffer.from(
    value
  )
    .toString("base64")
    .replace(
      /\+/g,
      "-"
    )
    .replace(
      /\//g,
      "_"
    )
    .replace(
      /=+$/,
      ""
    );
}

export async function sendEmail(
  userId: string,
  options: {
    to: string;
    subject: string;
    reply: string;
    threadId?: string;
  }
): Promise<{
  id: string;
  threadId: string;
}> {
  if (!options.to.trim()) {
    throw new Error(
      "Recipient is required."
    );
  }

  const gmail =
    await getGmailClient(
      userId
    );

  const message = [
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    options.reply,
  ].join("\r\n");

  const result =
    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw:
          encodeBase64Url(
            message
          ),
        threadId:
          options.threadId,
      },
    });

  return {
    id:
      result.data.id ??
      "",
    threadId:
      result.data.threadId ??
      options.threadId ??
      "",
  };
}
