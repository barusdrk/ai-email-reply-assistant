import axios from "axios";
import { env } from "../../config/env.js";
import type {
  EmailMessage,
  EmailProvider,
  EmailTokens,
  SendEmailInput,
} from "./types.js";

const GRAPH =
  "https://graph.microsoft.com/v1.0";

const AUTHORIZE_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";

const TOKEN_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/token";

function authHeaders(
  accessToken: string
) {
  return {
    Authorization:
      `Bearer ${accessToken}`,
  };
}

export class OutlookProvider
  implements EmailProvider {

  getAuthUrl() {
    const params =
      new URLSearchParams({
        client_id:
          env.MICROSOFT_CLIENT_ID,
        response_type:
          "code",
        redirect_uri:
          env.MICROSOFT_CALLBACK_URL,
        response_mode:
          "query",
        scope:
          [
            "offline_access",
            "https://graph.microsoft.com/Mail.Read",
            "https://graph.microsoft.com/Mail.Send",
          ].join(" "),
      });

    return (
      `${AUTHORIZE_URL}?` +
      params.toString()
    );
  }

  async exchangeCode(
    code: string
  ): Promise<EmailTokens> {
    const body =
      new URLSearchParams({
        client_id:
          env.MICROSOFT_CLIENT_ID,
        client_secret:
          env.MICROSOFT_CLIENT_SECRET,
        code,
        redirect_uri:
          env.MICROSOFT_CALLBACK_URL,
        grant_type:
          "authorization_code",
      });

    const { data } =
      await axios.post(
        TOKEN_URL,
        body.toString(),
        {
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
        }
      );

    return {
      access_token:
        data.access_token ?? undefined,
      refresh_token:
        data.refresh_token ?? undefined,
      token_type:
        data.token_type ?? undefined,
      scope:
        data.scope ?? undefined,
      expiry_date:
        data.expires_in
          ? Date.now() +
            Number(data.expires_in) *
              1000
          : undefined,
    };
  }

  async listMessages(
    accessToken: string
  ): Promise<EmailMessage[]> {
    const { data } =
      await axios.get(
        `${GRAPH}/me/messages`,
        {
          params: {
            $top: 20,
            $select:
              "id,conversationId,from,toRecipients,subject,bodyPreview,receivedDateTime,isRead",
            $orderby:
              "receivedDateTime DESC",
          },
          headers:
            authHeaders(accessToken),
        }
      );

    return (data.value ?? []).map(
      (message: any): EmailMessage => ({
        id:
          message.id ?? "",
        threadId:
          message.conversationId ??
          undefined,
        from:
          message.from?.emailAddress
            ?.address ?? "",
        to:
          message.toRecipients?.[0]
            ?.emailAddress?.address ??
          undefined,
        subject:
          message.subject ?? "",
        body:
          message.bodyPreview ?? "",
        preview:
          message.bodyPreview ?? "",
        receivedAt:
          message.receivedDateTime ??
          undefined,
        unread:
          message.isRead === false,
      })
    );
  }

  async getMessage(
    accessToken: string,
    id: string
  ): Promise<EmailMessage> {
    const { data } =
      await axios.get(
        `${GRAPH}/me/messages/${id}`,
        {
          headers:
            authHeaders(accessToken),
        }
      );

    return {
      id:
        data.id ?? "",
      threadId:
        data.conversationId ??
        undefined,
      from:
        data.from?.emailAddress
          ?.address ?? "",
      to:
        data.toRecipients?.[0]
          ?.emailAddress?.address ??
        undefined,
      subject:
        data.subject ?? "",
      body:
        data.body?.content ?? "",
      preview:
        data.bodyPreview ?? "",
      receivedAt:
        data.receivedDateTime ??
        undefined,
      unread:
        data.isRead === false,
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
          subject:
            message.subject,
          body: {
            contentType: "Text",
            content:
              message.body,
          },
          toRecipients: [
            {
              emailAddress: {
                address:
                  message.to,
              },
            },
          ],
        },
        saveToSentItems: true,
      },
      {
        headers:
          authHeaders(accessToken),
      }
    );
  }
}
