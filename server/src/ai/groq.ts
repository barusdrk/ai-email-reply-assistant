import OpenAI from "openai";
import { env } from "../config/env.js";
import type {
  AIProvider,
  GenerateReplyInput,
  SummarizeInput,
} from "./types.js";

const client = new OpenAI({
  apiKey: env.GROQ_API_KEY,
  baseURL:
    "https://api.groq.com/openai/v1",
});

export class GroqProvider implements AIProvider {
  readonly name = "groq" as const;

  async generateReply(
    input: GenerateReplyInput
  ): Promise<string> {
    const response =
      await client.chat.completions.create({
        model: env.GROQ_MODEL,
        messages: [
          {
            role: "user",
            content:
              `Write a ${input.tone}, ${input.length} email reply.\n\n${input.email}`,
          },
        ],
      });

    return (
      response.choices[0]?.message?.content ??
      ""
    );
  }

  async summarize(
    input: SummarizeInput
  ): Promise<string> {
    const response =
      await client.chat.completions.create({
        model: env.GROQ_MODEL,
        messages: [
          {
            role: "user",
            content: `Summarize:\n\n${input.text}`,
          },
        ],
      });

    return (
      response.choices[0]?.message?.content ??
      ""
    );
  }
}
