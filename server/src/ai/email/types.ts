export type EmailProviderName =
  | "gmail"
  | "outlook";

export interface EmailMessage {
  id: string;
  threadId?: string;
  from: string;
  to?: string;
  subject: string;
  body: string;
  preview: string;
  receivedAt?: string;
  unread: boolean;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface EmailTokens {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
}

export interface EmailProvider {
  getAuthUrl(): string;

  exchangeCode(
    code: string
  ): Promise<EmailTokens>;

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
