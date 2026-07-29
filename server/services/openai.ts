import OpenAI from "openai";
import {
  type Tone,
  type Length,
} from "../templates/tones.js";

const client =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY,
  });

export interface GenerateReplyInput {
  email: string;
  tone: Tone;
  length: Length;
}

export async function generateReply(
  input: GenerateReplyInput
) {
  const response =
    await client.responses.create({
      model: "gpt-5",
      input: `
You are an expert AI email assistant.

Write a professional customer email reply.

Tone:
${input.tone}

Length:
${input.length}

Customer email:

${input.email}

Rules:
- Reply only with the email.
- Be polite.
- Be accurate.
- Do not invent information.
- Do not explain reasoning.
`,
    });

  return response.output_text;
}

export async function summarizeEmail(
  email: string
) {
  const response =
    await client.responses.create({
      model: "gpt-5",
      input: `
Summarize this customer email.

Return:
- Main issue
- Important details
- Required action

Email:

${email}
`,
    });

  return response.output_text;
}

export async function classifyEmail(
  email: string
) {
  const response =
    await client.responses.create({
      model: "gpt-5",
      input: `
Classify this customer email.

Return one category only:
- billing
- technical
- complaint
- request
- general

Email:

${email}
`,
    });

  return response.output_text;
}
