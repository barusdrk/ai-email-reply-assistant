import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env.js";
import type {
  AIProvider,
  ClassifyInput,
  GenerateReplyInput,
  SummarizeInput,
} from "./types.js";

function getClient() {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("Claude is not configured.");
  }
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

export class ClaudeProvider implements AIProvider {
  readonly name = "claude" as const;

  async generateReply(input: GenerateReplyInput): Promise<string> {
    const response = await getClient().messages.create({
      model: env.CLAUDE_MODEL,
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `Write a ${input.tone}, ${input.length} email reply.\n\n${input.email}`,
      }],
    });
    const block = response.content[0];
    return block?.type === "text" ? block.text : "";
  }

  async summarize(input: SummarizeInput): Promise<string> {
    const response = await getClient().messages.create({
      model: env.CLAUDE_MODEL,
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `Summarize this email clearly and concisely:\n\n${input.text}`,
      }],
    });
    const block = response.content[0];
    return block?.type === "text" ? block.text : "";
  }

  async classify(input: ClassifyInput): Promise<string> {
    const response = await getClient().messages.create({
      model: env.CLAUDE_MODEL,
      max_tokens: 100,
      messages: [{
        role: "user",
        content: `Classify this email into one short category. Examples: support, sales, billing, complaint, feedback, general. Return only the category name.\n\n${input.text}`,
      }],
    });
    const block = response.content[0];
    return block?.type === "text" ? block.text.trim() : "";
  }
}
