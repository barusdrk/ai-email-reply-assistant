import { env } from "../config/env.js";
import type { AIProvider } from "./types.js";
import { OpenAIProvider } from "./openai.js";
import { GeminiProvider } from "./gemini.js";
import { GroqProvider } from "./groq.js";
import { ClaudeProvider } from "./claude.js";
import { MockAIProvider } from "./mock.js";

export type AIProviderName = "openai" | "gemini" | "groq" | "claude" | "mock";

export function createAIProvider(providerName: AIProviderName = "openai"): AIProvider {
  if (env.USE_MOCK_AI) {
    return new MockAIProvider();
  }

  switch (providerName) {
    case "gemini":
      return new GeminiProvider();
    case "groq":
      return new GroqProvider();
    case "claude":
      return new ClaudeProvider();
    case "mock":
      return new MockAIProvider();
    case "openai":
    default:
      return new OpenAIProvider();
  }
}
