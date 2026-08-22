export interface EmailMessage {
  id: string;
  threadId?: string;
  from: string;
  to?: string;
  subject: string;
  body: string;
  preview?: string;
  receivedAt?: string;
  unread?: boolean;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface EmailProvider {
  getAuthUrl(): string;

  exchangeCode(
    code: string
  ): Promise<unknown>;

  listMessages(
    accessToken: string
  ): Promise<EmailMessage[]>;

  getMessage(
    accessToken: string,
    id: string
  ): Promise<EmailMessage>;

  sendMessage(
    accessToken: string,
    message: SendEmailInput
  ): Promise<void>;
}
