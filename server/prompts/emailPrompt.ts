import {
  DEFAULT_LENGTH,
  DEFAULT_TONE,
  LENGTHS,
  TONES,
  type ReplyLength,
  type Tone,
} from "../templates/tones.js";

export interface BuildEmailPromptOptions {
  email: string;
  tone?: Tone;
  length?: ReplyLength;
  signature?: string;
}

export function buildEmailPrompt({
  email,
  tone = DEFAULT_TONE,
  length = DEFAULT_LENGTH,
  signature,
}: BuildEmailPromptOptions): string {
  const toneInstruction =
    TONES[tone].instruction;

  const lengthInstruction =
    LENGTHS[length].instruction;

  return `
You are an expert AI email assistant.

Your task is to write a reply to the customer's email.

Rules:

- Reply only with the email.
- ${toneInstruction}
- ${lengthInstruction}
- Be accurate.
- Be polite.
- Do not invent information.
- Answer every customer question.
- Use proper grammar.
- Keep the response natural.
- Do not explain your reasoning.

Customer email:

${email}

${
  signature
    ? `Finish with this signature:\n${signature}`
    : ""
}
`;
}
