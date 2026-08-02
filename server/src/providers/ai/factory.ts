import { env } from "../../config/env.js";
import type { AIProvider } from "./types.js";
import { OpenAIProvider } from "./openai.js";
import { GroqProvider } from "./groq.js";
import { GeminiProvider } from "./gemini.js";
import { MockAIProvider } from "./mock.js";

export function createAIProvider(): AIProvider {
  if (env.USE_MOCK_AI) {
    return new MockAIProvider();
  }

  switch (env.AI_PROVIDER.toLowerCase()) {
    case "groq":
      return new GroqProvider();

    case "gemini":
      return new GeminiProvider();

    case "openai":
    default:
      return new OpenAIProvider();
  }
}
