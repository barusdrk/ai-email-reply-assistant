import { env } from "../config/env.js";
import type { AIProvider } from "./types.js";
import { OpenAIProvider } from "./openai.js";
import { GeminiProvider } from "./gemini.js";
import { GroqProvider } from "./groq.js";
import { ClaudeProvider } from "./claude.js";
import { MockAIProvider } from "./mock.js";

export function createAIProvider(): AIProvider {
  if (env.USE_MOCK_AI) {
    return new MockAIProvider();
  }

  switch (env.AI_PROVIDER.toLowerCase()) {
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
