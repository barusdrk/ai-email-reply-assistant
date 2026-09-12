import { Types } from "mongoose";
import { google } from "googleapis";
import { env } from "../config/env.js";
import { connectedAccountRepository } from "../repositories/ConnectedAccountRepository.js";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];

export interface InboxEmail {
  id: string;
  threadId: string;
  messageIdHeader: string;
  references: string[];
  subject: string;
  from: string;
  senderName: string;
  senderEmail: string;
  preview: string;
  body: string;
  unread: boolean;
  archived: boolean;
  receivedAt?: Date;
}

export interface GoogleOAuthTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

function getOAuthClient() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) {
    throw new Error("Google OAuth is not configured.");
  }
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_CALLBACK_URL);
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64(value: string): string {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function getHeader(headers: Array<{ name?: string | null; value?: string | null }> | undefined, name: string): string {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value?.trim() ?? "";
}

function parseReferences(value: string): string[] {
  return value.match(/<[^>]+>/g) ?? [];
}

function extractBody(payload: any): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) return decodeBase64(payload.body.data);
  for (const part of payload.parts ?? []) {
    const body = extractBody(part);
    if (body) return body;
  }
  if (payload.body?.data) return decodeBase64(payload.body.data);
  return "";
}

function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/^(.*?)\s*<([^<>]+)>$/);
  if (match) {
    return {
      name: match[1].replace(/^["']|["']$/g, "").trim(),
      email: match[2].trim(),
    };
  }
  const emailMatch = from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) {
    const email = emailMatch[0].trim();
    return { name: from.replace(email, "").trim(), email };
  }
  return { name: from.trim(), email: "" };
}

export function getGoogleAuthUrl(userId: string): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: GMAIL_SCOPES,
    state: userId,
  });
}

export async function exchangeCode(code: string, state: string) {
  if (!Types.ObjectId.isValid(state)) throw new Error("Invalid user ID.");
  console.log("Exchanging Google OAuth code.");
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  console.log("Google OAuth granted scope:", tokens.scope);
  console.log("Google OAuth tokens received:", {
    accessToken: Boolean(tokens.access_token),
    refreshToken: Boolean(tokens.refresh_token),
    expiryDate: tokens.expiry_date,
  });
  if (!tokens.access_token) throw new Error("Google OAuth did not return an access token.");
  client.setCredentials(tokens);
  const gmail = google.gmail({ version: "v1", auth: client });
  const profile = await gmail.users.getProfile({ userId: "me" });
  const email = profile.data.emailAddress ?? "";
  if (!email) throw new Error("Unable to determine Gmail account email.");
  console.log("Google account identified:", email);
  const account = await connectedAccountRepository.upsert({
    userId: new Types.ObjectId(state),
    provider: "gmail",
    email,
    connected: true,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    syncStatus: "idle",
    lastError: "",
  });
  console.log("Gmail connected account saved:", {
    id: account?._id,
    userId: account?.userId,
    provider: account?.provider,
    connected: account?.connected,
  });
  return { userId: state, email };
}

export async function connectionStatus(userId: string): Promise<boolean> {
  const account = await connectedAccountRepository.findByProvider(userId, "gmail");
  return Boolean(account?.connected);
}

export async function disconnectAccount(userId: string): Promise<boolean> {
  const account = await connectedAccountRepository.remove(userId, "gmail");
  return Boolean(account);
}

async function getAccessToken(userId: string): Promise<string> {
  const account = await connectedAccountRepository.findByProvider(userId, "gmail");
  if (!account?.accessToken) throw new Error("Gmail is not connected.");

  const refreshBuffer = 60 * 1000;
  if (account.expiresAt && account.expiresAt.getTime() <= Date.now() + refreshBuffer && account.refreshToken) {
    const client = getOAuthClient();
    client.setCredentials({ refresh_token: account.refreshToken });
    const { credentials } = await client.refreshAccessToken();
    if (!credentials.access_token) throw new Error("Unable to refresh Gmail access token.");
    await connectedAccountRepository.update(String(account._id), {
      accessToken: credentials.access_token,
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
    });
    return credentials.access_token;
  }

  return account.accessToken;
}

async function getGmailClient(userId: string) {
  const client = getOAuthClient();
  const accessToken = await getAccessToken(userId);
  client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth: client });
}

export async function listEmails(userId: string, maxResults = 100): Promise<InboxEmail[]> {
  const gmail = await getGmailClient(userId);
  const limit = Math.min(100, Math.max(1, maxResults));
  const response = await gmail.users.messages.list({
    userId: "me",
    maxResults: limit,
    labelIds: ["INBOX"],
  });
  const messages = (response.data.messages ?? []).filter((message) => Boolean(message.id));

  return Promise.all(
    messages.map(async (message) => {
      const result = await gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "full",
      });
      const payload = result.data.payload;
      const headers = payload?.headers;
      const labelIds = result.data.labelIds ?? [];
      const internalDate = result.data.internalDate;
      const from = getHeader(headers, "From");
      const sender = parseSender(from);
      const messageIdHeader = getHeader(headers, "Message-ID");
      const referencesHeader = getHeader(headers, "References");

      return {
        id: message.id!,
        threadId: result.data.threadId ?? "",
        messageIdHeader,
        references: parseReferences(referencesHeader),
        subject: getHeader(headers, "Subject"),
        from,
        senderName: sender.name,
        senderEmail: sender.email,
        preview: result.data.snippet ?? "",
        body: extractBody(payload),
        unread: labelIds.includes("UNREAD"),
        archived: !labelIds.includes("INBOX"),
        receivedAt: internalDate ? new Date(Number(internalDate)) : new Date(),
      };
    })
  );
}

export async function sendEmail(
  userId: string,
  options: {
    to: string;
    subject: string;
    reply: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string[];
  }
): Promise<{ id: string; threadId: string }> {
  const gmail = await getGmailClient(userId);
  const subject = options.subject.startsWith("Re:") ? options.subject : `Re: ${options.subject}`;
  const headers = [
    `To: ${options.to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=UTF-8",
  ];

  if (options.inReplyTo) headers.push(`In-Reply-To: ${options.inReplyTo}`);
  if (options.references?.length) headers.push(`References: ${options.references.join(" ")}`);

  const message = [...headers, "", options.reply].join("\r\n");
  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodeBase64Url(message),
      ...(options.threadId ? { threadId: options.threadId } : {}),
    },
  });

  return {
    id: result.data.id ?? "",
    threadId: result.data.threadId ?? options.threadId ?? "",
  };
}
