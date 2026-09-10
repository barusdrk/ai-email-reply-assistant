import OpenAI from "openai";
import { env } from "../config/env.js";
import { resolveGeminiModel } from "./geminiModel.js";
import type { AIProvider, ClassifyInput, GenerateReplyInput, SummarizeInput } from "./types.js";
import { buildEmailPrompt } from "./prompts/emailPrompt.js";

function getClient() {
  if (!env.GEMINI_API_KEY) throw new Error("Gemini is not configured.");
  return new OpenAI({
    apiKey: env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
}

function cleanReply(reply: string): string {
  return reply.replace(/^Subject:\s*.+\r?\n\r?\n?/i, "").trim();
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;

  async generateReply(input: GenerateReplyInput): Promise<string> {
    const response = await getClient().chat.completions.create({
      model: await resolveGeminiModel(),
      messages: [{ role: "user", content: buildEmailPrompt(input) }],
    });
    return cleanReply(response.choices[0]?.message?.content ?? "");
  }

  async summarize(input: SummarizeInput): Promise<string> {
    const response = await getClient().chat.completions.create({
      model: await resolveGeminiModel(),
      messages: [{ role: "user", content: `Summarize this email clearly and concisely:\n\n${input.text}` }],
    });
    return (response.choices[0]?.message?.content ?? "").trim();
  }

  async classify(input: ClassifyInput): Promise<string> {
    const response = await getClient().chat.completions.create({
      model: await resolveGeminiModel(),
      messages: [{ role: "user", content: `Classify this email into one short category. Examples: support, sales, billing, complaint, feedback, general. Return only the category name.\n\n${input.text}` }],
    });
    return (response.choices[0]?.message?.content ?? "").trim();
  }
}
