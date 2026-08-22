import { ai } from "../ai/index.js";
import type { GenerateReplyInput } from "../ai/types.js";

export async function generateReply(
  input: GenerateReplyInput
): Promise<string> {
  return ai.generateReply(input);
}

export async function summarizeEmail(
  email: string
): Promise<string> {
  return ai.summarize({
    text: email,
  });
}

export async function classifyEmail(
  email: string
) {
  const summary = await ai.summarize({
    text: email,
  });

  return {
    category: "general",
    priority: "medium",
    summary,
  };
}
