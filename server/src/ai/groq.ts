import OpenAI from "openai";
import { env } from "../config/env.js";
import type { AIProvider, ClassifyInput, GenerateReplyInput, SummarizeInput } from "./types.js";
import { resolveGroqModel } from "./groqModel.js";
import { buildEmailPrompt } from "./prompts/emailPrompt.js";

function getClient() {
  if (!env.GROQ_API_KEY) throw new Error("Groq is not configured.");
  return new OpenAI({ apiKey: env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
}

function cleanReply(reply: string): string {
  return reply.replace(/^Subject:\s*.+\r?\n\r?\n?/i, "").trim();
}

export class GroqProvider implements AIProvider {
  readonly name = "groq" as const;

  async generateReply(input: GenerateReplyInput): Promise<string> {
    const model = await resolveGroqModel();
    console.log("Groq model:", model);
    console.log("Groq API key configured:", Boolean(env.GROQ_API_KEY));
    const response = await getClient().chat.completions.create({
      model,
      messages: [{ role: "user", content: buildEmailPrompt(input) }],
    });
    return cleanReply(response.choices[0]?.message?.content ?? "");
  }

  async summarize(input: SummarizeInput): Promise<string> {
    const response = await getClient().chat.completions.create({
      model: await resolveGroqModel(),
      messages: [{ role: "user", content: `Summarize this email clearly and concisely:\n\n${input.text}` }],
    });
    return (response.choices[0]?.message?.content ?? "").trim();
  }

  async classify(input: ClassifyInput): Promise<string> {
    const response = await getClient().chat.completions.create({
      model: await resolveGroqModel(),
      messages: [{ role: "user", content: `Classify this email into one short category. Examples: support, sales, billing, complaint, feedback, general. Return only the category name.\n\n${input.text}` }],
    });
    return (response.choices[0]?.message?.content ?? "").trim();
  }
}
