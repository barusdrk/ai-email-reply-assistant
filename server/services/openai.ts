import OpenAI from "openai";
import { env } from "../config/env";

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export async function generateReply(prompt: string): Promise<string> {
  const response = await client.responses.create({
    model: "gpt-5",
    input: prompt,
  });

  return response.output_text.trim();
}

export async function summarizeEmail(email: string): Promise<string> {
  const response = await client.responses.create({
    model: "gpt-5",
    input: `Summarize this email:\n\n${email}`,
  });

  return response.output_text.trim();
}

export async function classifyEmail(email: string): Promise<string> {
  const response = await client.responses.create({
    model: "gpt-5",
    input: `Classify this email into one category: Support, Sales, Billing, Feedback.\n\n${email}`,
  });

  return response.output_text.trim();
}
