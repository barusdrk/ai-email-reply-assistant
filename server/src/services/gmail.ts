import { google } from "googleapis";
import { env } from "../config/env.js";

const oauth = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_CALLBACK_URL
);

export interface InboxEmail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  preview: string;
  body: string;
}

export function getGoogleAuthUrl() {
  return {
    url: oauth.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.compose",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      prompt: "consent",
    }),
  };
}

export async function exchangeCode(
  code: string
) {
  const { tokens } =
    await oauth.getToken(code);

  oauth.setCredentials(tokens);

  return tokens;
}

export async function connectionStatus() {
  return {
    connected:
      !!oauth.credentials.access_token,
  };
}

export async function disconnectAccount() {
  oauth.setCredentials({});
  return true;
}

export async function listEmails(
  maxResults = 20
): Promise<InboxEmail[]> {
  const gmail = google.gmail({
    version: "v1",
    auth: oauth,
  });

  const { data } =
    await gmail.users.messages.list({
      userId: "me",
      maxResults,
    });

  const messages =
    data.messages ?? [];

  const emails: InboxEmail[] = [];

  for (const message of messages) {
    if (!message.id) continue;

    const full =
      await gmail.users.messages.get({
        userId: "me",
        id: message.id,
        format: "full",
      });

    const headers =
      full.data.payload?.headers ?? [];

    const subject =
      headers.find(
        h => h.name === "Subject"
      )?.value ?? "";

    const from =
      headers.find(
        h => h.name === "From"
      )?.value ?? "";

    let body = "";

    if (full.data.payload?.body?.data) {
      body = Buffer.from(
        full.data.payload.body.data,
        "base64"
      ).toString("utf8");
    }

    emails.push({
      id: full.data.id ?? "",
      threadId:
        full.data.threadId ?? "",
      subject,
      from,
      preview:
        full.data.snippet ?? "",
      body,
    });
  }

  return emails;
}
