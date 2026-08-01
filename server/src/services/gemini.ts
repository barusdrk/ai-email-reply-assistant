import {
  GoogleGenerativeAI,
} from "@google/generative-ai";

import {
  type Tone,
  type Length,
} from "../templates/tones.js";

const googleAI =
  new GoogleGenerativeAI(
    process.env.GOOGLE_AI_API_KEY ?? ""
  );

const model =
  googleAI.getGenerativeModel({
    model:"gemini-2.5-flash",
  });

export interface GenerateReplyInput {
  email:string;
  tone:Tone;
  length:Length;
}

export async function generateReply(
  input:GenerateReplyInput
) {
  const result =
    await model.generateContent(`
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
`);

  return result.response.text();
}

export async function summarizeEmail(
  email:string
) {
  const result =
    await model.generateContent(`
Summarize this customer email.

Return:
- Main issue
- Important details
- Required action

Email:
${email}
`);

  return result.response.text();
}

export async function classifyEmail(
  email:string
) {
  const result =
    await model.generateContent(`
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
`);

  return result.response.text();
}
