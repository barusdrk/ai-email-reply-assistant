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

export type AIProvider =
  | "openai"
  | "gemini";

function getProvider():AIProvider {
  return (
    process.env.AI_PROVIDER as AIProvider
  ) || "gemini";
}

export async function generateReply(
  input:GenerateReplyInput
) {
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
  const provider =
    getProvider();

  if (provider === "openai") {
    return openaiClassify(email);
  }

  return geminiClassify(email);
}
