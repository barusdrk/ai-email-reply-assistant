import { google } from "googleapis";
import { env } from "../../config/env.js";
import type {
  EmailMessage,
  EmailProvider,
  EmailTokens,
  SendEmailInput,
} from "./types.js";

const oauth2 = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_CALLBACK_URL
);

function getHeader(
  headers: Array<{
    name?: string | null;
    value?: string | null;
  }>,
  name: string
) {
  return (
    headers.find(
      header =>
        header.name?.toLowerCase() ===
        name.toLowerCase()
    )?.value ?? ""
  );
}

function decodeBody(
  data?: string | null
) {
  if (!data) return "";

  return Buffer.from(
    data
      .replace(/-/g, "+")
      .replace(/_/g, "/"),
    "base64"
  ).toString("utf8");
}

function extractBody(
  part?: any
): string {
  if (!part) return "";

  if (
    part.mimeType === "text/plain" &&
    part.body?.data
  ) {
    return decodeBody(part.body.data);
  }

  for (const child of part.parts ?? []) {
    const body = extractBody(child);

    if (body) return body;
  }

  return "";
}

export class GmailProvider
  implements EmailProvider {

  getAuthUrl() {
    return oauth2.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
      ],
    });
  }

  async exchangeCode(
    code: string
  ): Promise<EmailTokens> {
    const { tokens } =
      await oauth2.getToken(code);

    return {
      access_token:
        tokens.access_token ?? undefined,
      refresh_token:
        tokens.refresh_token ?? undefined,
      expiry_date:
        tokens.expiry_date ?? undefined,
      token_type:
        tokens.token_type ?? undefined,
      scope:
        tokens.scope ?? undefined,
    };
  }

  async listMessages(
    accessToken: string
  ): Promise<EmailMessage[]> {
    oauth2.setCredentials({
      access_token: accessToken,
    });

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2,
    });

    const { data } =
      await gmail.users.messages.list({
        userId: "me",
        maxResults: 20,
      });

    const messages =
      await Promise.all(
        (data.messages ?? []).map(
          async message =>
            this.getMessage(
              accessToken,
              message.id ?? ""
            )
        )
      );

    return messages.filter(
      message => message.id
    );
  }

  async getMessage(
    accessToken: string,
    id: string
  ): Promise<EmailMessage> {
    oauth2.setCredentials({
      access_token: accessToken,
    });

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2,
    });

    const { data } =
      await gmail.users.messages.get({
        userId: "me",
        id,
        format: "full",
      });

    const headers =
      data.payload?.headers ?? [];

    return {
      id: data.id ?? "",
      threadId:
        data.threadId ?? undefined,
      from:
        getHeader(headers, "From"),
      to:
        getHeader(headers, "To") ||
        undefined,
      subject:
        getHeader(headers, "Subject"),
      body:
        extractBody(data.payload),
      preview:
        data.snippet ?? "",
      receivedAt:
        data.internalDate
          ? new Date(
              Number(data.internalDate)
            ).toISOString()
          : undefined,
      unread: false,
    };
  }

  async sendMessage(
    accessToken: string,
    message: SendEmailInput
  ): Promise<void> {
    oauth2.setCredentials({
      access_token: accessToken,
    });

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2,
    });

    const mime = [
      `To: ${message.to}`,
      `Subject: ${message.subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      message.body,
    ].join("\r\n");

    const raw = Buffer.from(mime)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw,
      },
    });
  }
}