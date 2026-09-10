import OpenAI from "openai";
import { env } from "../config/env.js";
import type { AIProvider, ClassifyInput, GenerateReplyInput, SummarizeInput } from "./types.js";
import { resolveOpenAIModel } from "./openaiModel.js";
import { buildEmailPrompt } from "./prompts/emailPrompt.js";

function getClient() {
  if (!env.OPENAI_API_KEY) throw new Error("OpenAI is not configured.");
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

function cleanReply(reply: string): string {
  return reply.replace(/^Subject:\s*.+\r?\n\r?\n?/i, "").trim();
}

export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;

  async generateReply(input: GenerateReplyInput): Promise<string> {
    const model = await resolveOpenAIModel();
    const response = await getClient().responses.create({
      model,
      input: buildEmailPrompt(input),
    });
    return cleanReply(response.output_text);
  }

  async summarize(input: SummarizeInput): Promise<string> {
    const model = await resolveOpenAIModel();
    const response = await getClient().responses.create({
      model,
      input: `Summarize this email clearly and concisely:\n\n${input.text}`,
    });
    return response.output_text.trim();
  }

  async classify(input: ClassifyInput): Promise<string> {
    const model = await resolveOpenAIModel();
    const response = await getClient().responses.create({
      model,
      input: `Classify this email into one short category. Examples: support, sales, billing, complaint, feedback, general. Return only the category name.\n\n${input.text}`,
    });
    return response.output_text.trim();
  }
}
