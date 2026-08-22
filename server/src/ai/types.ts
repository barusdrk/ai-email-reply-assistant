export type AIProviderName =
  | "openai"
  | "gemini"
  | "groq"
  | "claude"
  | "mock";

export type Tone =
  | "professional"
  | "friendly"
  | "formal"
  | "empathetic"
  | "concise"
  | "enthusiastic";

export type ReplyLength =
  | "short"
  | "medium"
  | "long";

export interface GenerateReplyInput {
  email: string;
  tone: Tone;
  length: ReplyLength;
  signature?: string;
}

export interface SummarizeInput {
  text: string;
}

export interface AIProvider {
  readonly name: AIProviderName;

  generateReply(
    input: GenerateReplyInput
  ): Promise<string>;

  summarize(
    input: SummarizeInput
  ): Promise<string>;
}
