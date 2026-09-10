import OpenAI from "openai";
import { Types } from "mongoose";
import EmailModel from "../models/Email.js";
import { env } from "../config/env.js";
import { EMAIL_CLASSIFICATION_PROMPT } from "../prompts/emailClassificationPrompt.js";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export type EmailCategory =
  | "refund"
  | "cancellation"
  | "billing"
  | "account"
  | "technical"
  | "shipping"
  | "product"
  | "feature_request"
  | "complaint"
  | "other";

export interface EmailClassification {
  category: EmailCategory;
  confidence: number;
}

const CATEGORIES: EmailCategory[] = ["refund", "cancellation", "billing", "account", "technical", "shipping", "product", "feature_request", "complaint", "other"];

function parseClassification(value: string): EmailClassification {
  const parsed = JSON.parse(value) as Partial<EmailClassification>;
  if (!parsed.category || !CATEGORIES.includes(parsed.category as EmailCategory)) throw new Error("AI returned an invalid email category.");
  const confidence = Number(parsed.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error("AI returned an invalid classification confidence.");
  return { category: parsed.category as EmailCategory, confidence };
}

export async function classifyEmail(emailId: string, userId: string): Promise<EmailClassification> {
  if (!Types.ObjectId.isValid(emailId) || !Types.ObjectId.isValid(userId)) throw new Error("Invalid email or user ID.");
  const email = await EmailModel.findOne({ _id: new Types.ObjectId(emailId), userId: new Types.ObjectId(userId) }).lean();
  if (!email) throw new Error("Email not found.");
  const response = await openai.responses.create({
    model: "gpt-5",
    input: [
      { role: "system", content: EMAIL_CLASSIFICATION_PROMPT },
      { role: "user", content: JSON.stringify({ subject: email.subject, body: email.body || email.preview }) },
    ],
  });
  const classification = parseClassification(response.output_text);
  await EmailModel.updateOne({ _id: email._id, userId: email.userId }, { $set: { classification } });
  return classification;
}
