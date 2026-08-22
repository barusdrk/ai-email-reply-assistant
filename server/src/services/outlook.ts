import { ConfidentialClientApplication } from "@azure/msal-node";
import { Types } from "mongoose";
import { connectedAccountRepository } from "../repositories/ConnectedAccountRepository.js";
import { syncInbox } from "./email.js";
import type { InboxEmail } from "./gmail.js";
import { env } from "../config/env.js";
import { htmlToText } from "../utils/emailBody.js";

function requiredEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function getMicrosoftConfig() {
  return {
    clientId: requiredEnv(env.MICROSOFT_CLIENT_ID, "MICROSOFT_CLIENT_ID"),
    clientSecret: requiredEnv(env.MICROSOFT_CLIENT_SECRET, "MICROSOFT_CLIENT_SECRET"),
    callbackUrl: requiredEnv(env.MICROSOFT_CALLBACK_URL, "MICROSOFT_CALLBACK_URL"),
  };
}

function getMsalClient() {
  const config = getMicrosoftConfig();
  return new ConfidentialClientApplication({
    auth: {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authority: "https://login.microsoftonline.com/common",
    },
  });
}

const SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "Mail.Read",
  "Mail.Send",
];

function getUserObjectId(userId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }
  return new Types.ObjectId(userId);
}

export async function getMicrosoftAuthUrl(userId: string) {
  getUserObjectId(userId);
  const { callbackUrl } = getMicrosoftConfig();

  return getMsalClient().getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri: callbackUrl,
    state: userId,
    prompt: "select_account",
  });
}

export async function exchangeMicrosoftCode(code: string, state: string) {
  const userId = getUserObjectId(state);
  const { callbackUrl } = getMicrosoftConfig();

  const result = await getMsalClient().acquireTokenByCode({
    code,
    scopes: SCOPES,
    redirectUri: callbackUrl,
  });

  if (!result.accessToken) {
    throw new Error("Microsoft did not return an access token.");
  }

  await connectedAccountRepository.upsert({
    userId,
    provider: "outlook",
    connected: true,
    accessToken: result.accessToken,
    refreshToken: "",
    expiresAt: result.expiresOn ?? undefined,
  });

  return {
    connected: true,
    account: result.account?.username ?? null,
  };
}

export async function connectOutlook(userId: string) {
  return {
    connected: false,
    url: await getMicrosoftAuthUrl(userId),
  };
}

export async function disconnectOutlook(userId: string) {
  getUserObjectId(userId);
  await connectedAccountRepository.remove(userId, "outlook");
  return { connected: false };
}

export async function outlookStatus(userId: string) {
  getUserObjectId(userId);

  const account = await connectedAccountRepository.findOne(
    userId,
    "outlook"
  );

  return {
    connected: Boolean(account?.connected && account.accessToken),
  };
}

export async function syncOutlook(userId: string) {
  return syncInbox("outlook", userId);
}

async function getAccessToken(userId: string) {
  getUserObjectId(userId);

  const account = await connectedAccountRepository.findOne(
    userId,
    "outlook"
  );

  if (!account?.connected || !account.accessToken) {
    throw new Error("Outlook account is not connected.");
  }

  return account.accessToken;
}

interface GraphMessage {
  id?: string;
  conversationId?: string;
  subject?: string;
  from?: {
    emailAddress?: {
      address?: string;
      name?: string;
    };
  };
  bodyPreview?: string;
  body?: {
    content?: string;
    contentType?: string;
  };
  receivedDateTime?: string;
}

interface GraphResponse {
  value?: GraphMessage[];
  "@odata.nextLink"?: string;
}

function toInboxEmail(message: GraphMessage): InboxEmail {
  const address = message.from?.emailAddress?.address ?? "";
  const name = message.from?.emailAddress?.name ?? "";
  const from = name && address ? `${name} <${address}>` : address;

  return {
    id: message.id ?? "",
    threadId: message.conversationId ?? "",
    subject: message.subject ?? "",
    from,
    preview: message.bodyPreview ?? "",
    body: message.body?.contentType === "html"
      ? htmlToText(message.body.content ?? "")
      : message.body?.content ?? "",
  };
}

export async function listEmails(
  userId: string,
  maxResults = 100
): Promise<InboxEmail[]> {
  const accessToken = await getAccessToken(userId);
  const pageSize = Math.min(100, Math.max(1, maxResults));
  const emails: InboxEmail[] = [];

  const params = new URLSearchParams({
    "$top": String(pageSize),
    "$select": [
      "id",
      "conversationId",
      "subject",
      "from",
      "bodyPreview",
      "body",
      "receivedDateTime",
    ].join(","),
    "$orderby": "receivedDateTime DESC",
  });

  let nextUrl =
    `https://graph.microsoft.com/v1.0/me/messages?${params.toString()}`;

  while (nextUrl && emails.length < maxResults) {
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Microsoft Graph request failed: ${response.status} ${text}`
      );
    }

    const data = await response.json() as GraphResponse;

    for (const message of data.value ?? []) {
      if (emails.length >= maxResults) break;
      if (!message.id) continue;
      emails.push(toInboxEmail(message));
    }

    nextUrl = data["@odata.nextLink"] ?? "";
  }

  return emails;
}

function extractEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

export async function sendEmail(
  userId: string,
  options: {
    to: string;
    subject: string;
    reply: string;
  }
) {
  const accessToken = await getAccessToken(userId);

  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me/sendMail",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject:
            options.subject.startsWith("Re:")
              ? options.subject
              : `Re: ${options.subject}`,
          body: {
            contentType: "Text",
            content: options.reply,
          },
          toRecipients: [
            {
              emailAddress: {
                address: extractEmailAddress(
                  options.to
                ),
              },
            },
          ],
        },
        saveToSentItems: true,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `Microsoft Graph send failed: ${response.status} ${text}`
    );
  }

  return {
    sent: true,
  };
}
