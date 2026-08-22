import OpenAI from "openai";
import { env } from "../config/env.js";
import type {
  AIProvider,
  GenerateReplyInput,
  SummarizeInput,
} from "./types.js";

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;

  async generateReply(
    input: GenerateReplyInput
  ): Promise<string> {
    const response = await client.responses.create({
      model: env.OPENAI_MODEL,
      input: `Write a ${input.tone}, ${input.length} email reply.\n\n${input.email}`,
    });

    return response.output_text;
  }

  async summarize(
    input: SummarizeInput
  ): Promise<string> {
    const response = await client.responses.create({
      model: env.OPENAI_MODEL,
      input: `Summarize:\n\n${input.text}`,
    });

    return response.output_text;
  }
}
