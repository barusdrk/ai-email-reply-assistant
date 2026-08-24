import axios from "axios";
import { env } from "../../config/env.js";
import type {
  EmailMessage,
  EmailProvider,
  EmailTokens,
  SendEmailInput,
} from "./types.js";

const GRAPH = "https://graph.microsoft.com/v1.0";
const AUTH_URL = `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize`;
const TOKEN_URL = `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;

function requireOutlookConfig() {
  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CALLBACK_URL) {
    throw new Error("Microsoft Outlook OAuth is not configured.");
  }
}

export class OutlookProvider implements EmailProvider {
  getAuthUrl() {
    requireOutlookConfig();

    const params = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID!,
      response_type: "code",
      redirect_uri: env.MICROSOFT_CALLBACK_URL!,
      response_mode: "query",
      scope: "openid profile offline_access User.Read Mail.Read Mail.Send",
    });

    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<EmailTokens> {
    requireOutlookConfig();

    if (!env.MICROSOFT_CLIENT_SECRET) {
      throw new Error("Microsoft Outlook client secret is not configured.");
    }

    const params = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID!,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      code,
      redirect_uri: env.MICROSOFT_CALLBACK_URL!,
      grant_type: "authorization_code",
      scope: "openid profile offline_access User.Read Mail.Read Mail.Send",
    });

    const { data } = await axios.post<EmailTokens>(
      TOKEN_URL,
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return data;
  }

  async listMessages(accessToken: string): Promise<EmailMessage[]> {
    const { data } = await axios.get(`${GRAPH}/me/messages`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        $top: 20,
        $select:
          "id,conversationId,from,toRecipients,subject,bodyPreview,receivedDateTime,isRead",
      },
    });

    return (data.value ?? []).map((m: any) => ({
      id: m.id,
      threadId: m.conversationId,
      from: m.from?.emailAddress?.address ?? "",
      to: m.toRecipients?.[0]?.emailAddress?.address,
      subject: m.subject ?? "",
      body: m.bodyPreview ?? "",
      preview: m.bodyPreview ?? "",
      receivedAt: m.receivedDateTime,
      unread: m.isRead === false,
    }));
  }

  async getMessage(
    accessToken: string,
    id: string
  ): Promise<EmailMessage> {
    const { data } = await axios.get(
      `${GRAPH}/me/messages/${encodeURIComponent(id)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      id: data.id,
      threadId: data.conversationId,
      from: data.from?.emailAddress?.address ?? "",
      to: data.toRecipients?.[0]?.emailAddress?.address,
      subject: data.subject ?? "",
      body: data.body?.content ?? "",
      preview: data.bodyPreview ?? "",
      receivedAt: data.receivedDateTime,
      unread: data.isRead === false,
    };
  }

  async sendMessage(
    accessToken: string,
    message: SendEmailInput
  ): Promise<void> {
    await axios.post(
      `${GRAPH}/me/sendMail`,
      {
        message: {
          subject: message.subject,
          body: {
            contentType: "Text",
            content: message.body,
          },
          toRecipients: [
            {
              emailAddress: {
                address: message.to,
              },
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  }
}
