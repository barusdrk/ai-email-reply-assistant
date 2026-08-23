import type {
  AIProvider,
  ClassifyInput,
  GenerateReplyInput,
  SummarizeInput,
} from "./types.js";

export class MockAIProvider implements AIProvider {
  readonly name = "mock" as const;

  async generateReply(input: GenerateReplyInput): Promise<string> {
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

  async summarize(input: SummarizeInput): Promise<string> {
    return `Mock summary:\n\n${input.text.slice(0, 200)}...`;
  }

  async classify(input: ClassifyInput): Promise<string> {
    const text = input.text.toLowerCase();

    if (
      text.includes("invoice") ||
      text.includes("payment") ||
      text.includes("refund") ||
      text.includes("price")
    ) {
      return "billing";
    }

    if (
      text.includes("buy") ||
      text.includes("purchase") ||
      text.includes("demo")
    ) {
      return "sales";
    }

    if (
      text.includes("help") ||
      text.includes("problem") ||
      text.includes("error")
    ) {
      return "support";
    }

    return "general";
  }
}
