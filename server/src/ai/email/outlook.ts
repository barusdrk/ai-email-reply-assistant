import axios from "axios";
import type {
  EmailMessage,
  EmailProvider,
  SendEmailInput,
} from "./types.js";

const GRAPH =
  "https://graph.microsoft.com/v1.0";

export class OutlookProvider
  implements EmailProvider {

  getAuthUrl() {
    return "";
  }

  async exchangeCode(
    code: string
  ) {
    return { code };
  }

  async listMessages(
    accessToken: string
  ): Promise<EmailMessage[]> {
    const { data } =
      await axios.get(
        `${GRAPH}/me/messages`,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
        }
      );

    return data.value.map(
      (m: any) => ({
        id: m.id,
        threadId:
          m.conversationId,
        from:
          m.from?.emailAddress
            ?.address ?? "",
        subject:
          m.subject,
        body:
          m.bodyPreview ?? "",
        preview:
          m.bodyPreview,
        receivedAt:
          m.receivedDateTime,
        unread:
          m.isRead === false,
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
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
        }
      );

    return {
      id: data.id,
      threadId:
        data.conversationId,
      from:
        data.from?.emailAddress
          ?.address ?? "",
      to:
        data.toRecipients?.[0]
          ?.emailAddress
          ?.address,
      subject:
        data.subject,
      body:
        data.body?.content ??
        "",
      preview:
        data.bodyPreview,
      receivedAt:
        data.receivedDateTime,
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
            contentType:
              "Text",
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
      },
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      }
    );
  }
}
