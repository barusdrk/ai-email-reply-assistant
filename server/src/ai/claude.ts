import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env.js";
import type {
  AIProvider,
  GenerateReplyInput,
  SummarizeInput,
} from "./types.js";

const client = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

export class ClaudeProvider implements AIProvider {
  readonly name = "claude" as const;

  async generateReply(
    input: GenerateReplyInput
  ): Promise<string> {
    const response =
      await client.messages.create({
        model: env.CLAUDE_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content:
              `Write a ${input.tone}, ${input.length} email reply.\n\n${input.email}`,
          },
        ],
      });

    const block = response.content[0];

    return block.type === "text"
      ? block.text
      : "";
  }

  async summarize(
    input: SummarizeInput
  ): Promise<string> {
    const response =
      await client.messages.create({
        model: env.CLAUDE_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content:
              `Summarize:\n\n${input.text}`,
          },
        ],
      });

    const block = response.content[0];

    return block.type === "text"
      ? block.text
      : "";
  }
}
