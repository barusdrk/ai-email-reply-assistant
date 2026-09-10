import type { GenerateReplyInput } from "../types.js";

export function buildEmailPrompt(input: GenerateReplyInput): string {
  const knowledgeBaseSection = input.knowledgeBase?.length
    ? `\nAuthoritative knowledge base:\n${input.knowledgeBase
        .map(
          (item) =>
            `Title: ${item.title}\nContent: ${item.content}`
        )
        .join("\n\n")}\n`
    : "";

  const conversationSection = input.conversationHistory?.length
    ? `\nPrevious conversation context:\n${input.conversationHistory
        .map(
          (message, index) =>
            `Message ${index + 1} (${message.role}, ${message.timestamp})${
              message.subject ? `\nSubject: ${message.subject}` : ""
            }\n${message.content}`
        )
        .join("\n\n")}\n`
    : "";

  return `Write a high-quality email reply.

Customer email:
"""
${input.email}
"""

Requirements:
- Tone: ${input.tone}
- Length: ${input.length}
${input.signature ? `- Include this signature:\n${input.signature}` : ""}
${knowledgeBaseSection}${conversationSection}

Instructions:
- Answer every question in the email.
- Be clear, helpful, and concise.
- Sound natural and human.
- Be professional and polite.
- Do not mention AI.
- Do not invent facts.
- Use the knowledge base as the authoritative source for current company policies, prices, refunds, deadlines, and other business information.
- Use previous conversation context only as supporting context.
- If conversation history conflicts with the knowledge base, follow the knowledge base.
- Preserve relevant previous commitments and unresolved issues when appropriate.
- Do not promise actions that were not requested.
- Preserve formatting when appropriate.
- Do not write a subject line.
- Do not include "Subject:".
- Return only the email body.
- End naturally.

Return only the email reply.`;
}
