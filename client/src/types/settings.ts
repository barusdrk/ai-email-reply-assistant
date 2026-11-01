export type AIProvider =
  | "openai"
  | "groq"
  | "gemini"
  | "claude";

export type ReplyTone =
  | "friendly"
  | "formal"
  | "professional"
  | "concise"
  | "empathetic"
  | "enthusiastic";

export type Theme =
  | "light"
  | "dark"
  | "system";

export interface AISettings {
  provider: AIProvider;
  defaultReplyTone: ReplyTone;
  defaultLength:
    | "short"
    | "medium"
    | "long";
  temperature: number;
  maxDailyReplies: number;
  autoDraft: boolean;
  autoSendEnabled: boolean;
  signature: string;
  theme: Theme;
  language: string;
  timezone: string;
  emailNotifications: boolean;
  desktopNotifications: boolean;
  openAiApiKey?: string;
  groqApiKey?: string;
  geminiApiKey?: string;
}
