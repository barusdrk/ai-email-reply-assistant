import {
  DEFAULT_LENGTH,
  DEFAULT_TONE,
  LENGTHS,
  TONES,
  type ReplyLength,
  type Tone,
} from "../templates/tones.js";
import type { KnowledgeBaseContext } from "../ai/types.js";

export interface BuildEmailPromptOptions {
  email: string;
  tone?: Tone;
  length?: ReplyLength;
  signature?: string;
  knowledgeBase?: KnowledgeBaseContext[];
}

export function buildEmailPrompt({
  email,
  tone = DEFAULT_TONE,
  length = DEFAULT_LENGTH,
  signature,
  knowledgeBase = [],
}: BuildEmailPromptOptions): string {
  const toneInstruction = TONES[tone].instruction;
  const lengthInstruction = LENGTHS[length].instruction;

  const knowledgeBaseSection = knowledgeBase.length > 0
    ? `
Relevant company knowledge base:

${knowledgeBase.map((article) => `Title: ${article.title}
Category: ${article.category ?? "general"}
Content:
${article.content}`).join("\n\n")}

Knowledge base rules:

- Treat the knowledge base as the authoritative source for company-specific information.
- Use it when answering questions about company policies, products, billing, refunds, cancellations, shipping, accounts, or technical support.
- Do not contradict information from the knowledge base.
- Do not invent company policies, prices, guarantees, timelines, or procedures.
- If the knowledge base does not contain enough information to answer a question, do not make up an answer.
`
    : `
No relevant company knowledge base information was found.

Do not invent company-specific policies, prices, guarantees, timelines, or procedures.
`;

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

${knowledgeBaseSection}

${
  signature
    ? `Finish with this signature:\n${signature}`
    : ""
}
`;
}
