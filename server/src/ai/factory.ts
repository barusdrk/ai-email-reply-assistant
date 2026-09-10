import type { AIProvider } from "./types.js";
import { OpenAIProvider } from "./openai.js";
import { GeminiProvider } from "./gemini.js";
import { GroqProvider } from "./groq.js";
import { ClaudeProvider } from "./claude.js";

export type AIProviderName = "openai" | "gemini" | "groq" | "claude";

export function createAIProvider(providerName: AIProviderName = "openai"): AIProvider {
  switch (providerName) {
    case "gemini":
      return new GeminiProvider();
    case "groq":
      return new GroqProvider();
    case "claude":
      return new ClaudeProvider();
    case "openai":
    default:
      return new OpenAIProvider();
  }
}
