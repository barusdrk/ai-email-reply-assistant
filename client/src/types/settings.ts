export type AIProvider =
  | "openai"
  | "gemini";

export interface AISettings {
  id?: string;

  provider: AIProvider;

  openAiApiKey?: string;

  geminiApiKey?: string;

  defaultTone: string;

  defaultLength: string;

  temperature: number;

  maxDailyReplies: number;

  createdAt?: string;

  updatedAt?: string;
}
