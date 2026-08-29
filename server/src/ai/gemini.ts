import OpenAI from "openai";
import { env } from "../config/env.js";
import type { AIProvider, ClassifyInput, GenerateReplyInput, SummarizeInput } from "./types.js";
import { resolveGeminiModel } from "./geminiModel.js";

function getClient() {
  if (!env.GEMINI_API_KEY) throw new Error("Gemini is not configured.");
  return new OpenAI({
    apiKey: env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;

  async generateReply(input: GenerateReplyInput): Promise<string> {
    const model = await resolveGeminiModel();
    const response = await getClient().chat.completions.create({
      model,
      messages: [{ role: "user", content: `Write a ${input.tone}, ${input.length} email reply.\n\n${input.email}` }],
    });
    return response.choices[0]?.message?.content ?? "";
  }

  async summarize(input: SummarizeInput): Promise<string> {
    const model = await resolveGeminiModel();
    const response = await getClient().chat.completions.create({
      model,
      messages: [{ role: "user", content: `Summarize this email clearly and concisely:\n\n${input.text}` }],
    });
    return response.choices[0]?.message?.content ?? "";
  }

  async classify(input: ClassifyInput): Promise<string> {
    const model = await resolveGeminiModel();
    const response = await getClient().chat.completions.create({
      model,
      messages: [{ role: "user", content: `Classify this email into one short category. Examples: support, sales, billing, complaint, feedback, general. Return only the category name.\n\n${input.text}` }],
    });
    return (response.choices[0]?.message?.content ?? "").trim();
  }
}
