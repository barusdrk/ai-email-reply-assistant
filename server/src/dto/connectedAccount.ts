import type { EmailProvider } from "../types/email.js";

export interface CreateConnectedAccountInput {
  userId: string;
  provider: EmailProvider;
  providerUserId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  scope?: string;
  expiryDate?: Date;
}

export interface UpdateConnectedAccountInput {
  accessToken?: string;
  refreshToken?: string;
  expiryDate?: Date;
  historyId?: string;
  webhookId?: string;
  watchExpiration?: Date;
  connected?: boolean;
  syncStatus?: string;
  lastSyncAt?: Date;
  lastError?: string;
}
