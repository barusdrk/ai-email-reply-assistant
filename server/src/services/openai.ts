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
  email:string;
  tone:Tone;
  length:Length;
}

export async function generateReply(
  input:GenerateReplyInput
) {
  const response =
    await client.responses.create({
      model:"gpt-5",
      input:`
You are an AI email assistant.

Write a professional customer reply.

Tone:
${input.tone}

Length:
${input.length}

Customer email:
${input.email}

Rules:
- Reply only with the email.
- Be polite.
- Do not invent information.
- Do not explain reasoning.
`,
    });

  return response.output_text;
}

export async function summarizeEmail(
  email:string
) {
  const response =
    await client.responses.create({
      model:"gpt-5",
      input:`
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
  email:string
) {
  const response =
    await client.responses.create({
      model:"gpt-5",
      input:`
Classify this customer email.

Categories:
billing
technical
complaint
request
general

Return only the category.

Email:
${email}
`,
    });

  return response.output_text;
}
