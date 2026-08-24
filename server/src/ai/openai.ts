import OpenAI from "openai";
import { env } from "../config/env.js";
import type {
  AIProvider,
  ClassifyInput,
  GenerateReplyInput,
  SummarizeInput,
} from "./types.js";

function getClient() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OpenAI is not configured.");
  }
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;

  async generateReply(input: GenerateReplyInput): Promise<string> {
    const response = await getClient().responses.create({
      model: env.OPENAI_MODEL,
      input: `Write a ${input.tone}, ${input.length} email reply.\n\n${input.email}`,
    });
    return response.output_text;
  }

  async summarize(input: SummarizeInput): Promise<string> {
    const response = await getClient().responses.create({
      model: env.OPENAI_MODEL,
      input: `Summarize this email clearly and concisely:\n\n${input.text}`,
    });
    return response.output_text;
  }

  async classify(input: ClassifyInput): Promise<string> {
    const response = await getClient().responses.create({
      model: env.OPENAI_MODEL,
      input: `Classify this email into one short category. Examples: support, sales, billing, complaint, feedback, general. Return only the category name.\n\n${input.text}`,
    });
    return response.output_text.trim();
  }
}
