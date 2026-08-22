import type {
  AIProvider,
  GenerateReplyInput,
  SummarizeInput,
} from "./types.js";

export class MockAIProvider implements AIProvider {
  readonly name = "mock" as const;

  async generateReply(
    input: GenerateReplyInput
  ): Promise<string> {
    return [
      "Hello,",
      "",
      "Thank you for your email.",
      "",
      `This is a mock ${input.tone} ${input.length} reply.`,
      "",
      "Best regards,",
      "AI Assistant",
    ].join("\n");
  }

  async summarize(
    input: SummarizeInput
  ): Promise<string> {
    return (
      `Mock summary:\n\n` +
      `${input.text.slice(0, 200)}...`
    );
  }
}
