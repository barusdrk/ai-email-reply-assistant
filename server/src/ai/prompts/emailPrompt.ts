import type {
  GenerateReplyInput,
} from "../types.js";

export function buildEmailPrompt(
  input: GenerateReplyInput
) {
  return `
Write a high-quality email reply.

Customer email:
"""
${input.email}
"""

Requirements:
- Tone: ${input.tone}
- Length: ${input.length}
${input.signature ? `- Include this signature:\n${input.signature}` : ""}

Instructions:
- Answer every question in the email.
- Be clear, helpful, and concise.
- Sound natural and human.
- Be professional and polite.
- Do not mention AI.
- Do not invent facts.
- Do not promise actions that were not requested.
- Preserve formatting when appropriate.
- End naturally.

Return only the email reply.
`;
}
