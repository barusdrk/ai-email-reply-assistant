import { google } from "googleapis";
import { env } from "../../config/env.js";
import type {
  EmailMessage,
  EmailProvider,
  SendEmailInput,
} from "./types.js";

const oauth2 =
  new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_CALLBACK_URL
  );

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
  ) {
    const { tokens } =
      await oauth2.getToken(code);

    oauth2.setCredentials(tokens);

    return tokens;
  }

  async listMessages(
    accessToken: string
  ): Promise<EmailMessage[]> {
    oauth2.setCredentials({
      access_token: accessToken,
    });

    const gmail =
      google.gmail({
        version: "v1",
        auth: oauth2,
      });

    const { data } =
      await gmail.users.messages.list({
        userId: "me",
        maxResults: 20,
      });

    return (data.messages ?? []).map(
      message => ({
        id: message.id ?? "",
        threadId:
          message.threadId ?? undefined,
        from: "",
        subject: "",
        body: "",
        preview: "",
        receivedAt: "",
        unread: false,
      })
    );
  }

  async getMessage(
    accessToken: string,
    id: string
  ): Promise<EmailMessage> {
    oauth2.setCredentials({
      access_token: accessToken,
    });

    const gmail =
      google.gmail({
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

    const header =
      (name: string) =>
        headers.find(
          h => h.name === name
        )?.value ?? "";

    return {
      id: data.id ?? "",
      threadId:
        data.threadId ?? undefined,
      from:
        header("From"),
      to:
        header("To"),
      subject:
        header("Subject"),
      body: "",
      preview:
        data.snippet ?? "",
      receivedAt:
        data.internalDate ?? undefined,
      unread: false,
    };
  }

  async sendMessage(
    accessToken: string,
    raw: SendEmailInput
  ): Promise<void> {
    oauth2.setCredentials({
      access_token: accessToken,
    });

    const gmail =
      google.gmail({
        version: "v1",
        auth: oauth2,
      });

    const mime =
      [
        `To: ${raw.to}`,
        `Subject: ${raw.subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        raw.body,
      ].join("\n");

    const encoded =
      Buffer.from(mime)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encoded,
      },
    });
  }
}
