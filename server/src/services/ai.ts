import {
  generateReply as openaiReply,
  summarizeEmail as openaiSummary,
  classifyEmail as openaiClassify,
  type GenerateReplyInput,
} from "./openai.js";

import {
  generateReply as geminiReply,
  summarizeEmail as geminiSummary,
  classifyEmail as geminiClassify,
} from "./gemini.js";

import { env } from "../config/env.js";

export type AIProvider =
  | "openai"
  | "gemini";

function getProvider():AIProvider {
  return (
    process.env.AI_PROVIDER as AIProvider
  ) || "gemini";
}

function mockReply() {
  return {
    reply:
      "Thank you for contacting us. We received your message and will get back to you shortly.",
  };
}

function mockSummary() {
  return {
    summary:[
      "Customer email received.",
      "Request requires review.",
      "Follow-up response needed.",
    ],
  };
}

function mockClassification() {
  return {
    category:
      "general",
    priority:
      "medium",
  };
}

export async function generateReply(
  input:GenerateReplyInput
) {
  if (env.USE_MOCK_AI) {
    return mockReply();
  }

  const provider =
    getProvider();

  if (provider === "openai") {
    return openaiReply(input);
  }

  return geminiReply(input);
}

export async function summarizeEmail(
  email:string
) {
  if (env.USE_MOCK_AI) {
    return mockSummary();
  }

  const provider =
    getProvider();

  if (provider === "openai") {
    return openaiSummary(email);
  }

  return geminiSummary(email);
}

export async function classifyEmail(
  email:string
) {
  if (env.USE_MOCK_AI) {
    return mockClassification();
  }

  const provider =
    getProvider();

  if (provider === "openai") {
    return openaiClassify(email);
  }

  return geminiClassify(email);
}
