export type AIProviderName = "openai" | "gemini" | "groq" | "claude";
export type Tone = "professional" | "friendly" | "formal" | "empathetic" | "concise" | "enthusiastic";
export type ReplyLength = "short" | "medium" | "long";

export interface KnowledgeBaseContext {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}

export interface ConversationContext {
  role: "customer" | "company";
  subject: string;
  content: string;
  timestamp: string;
}

export interface GenerateReplyInput {
  userId?: string;
  email: string;
  tone: Tone;
  length: ReplyLength;
  signature?: string;
  knowledgeBase?: KnowledgeBaseContext[];
  conversationHistory?: ConversationContext[];
}

export interface SummarizeInput {
  text: string;
}

export interface ClassifyInput {
  text: string;
}

export interface AIProvider {
  readonly name: AIProviderName;
  generateReply(input: GenerateReplyInput): Promise<string>;
  summarize(input: SummarizeInput): Promise<string>;
  classify(input: ClassifyInput): Promise<string>;
}

export interface ConfidenceScore {
  score: number;
  level: "high" | "medium" | "low";
  reasons: string[];
}
