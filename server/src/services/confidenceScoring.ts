import OpenAI from "openai";
import {env} from "../config/env.js";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ConfidenceScore {
  score: number;
  level: ConfidenceLevel;
  reasons: string[];
}

interface ConfidenceInput {
  email: string;
  reply: string;
  knowledgeBase?: {
    title: string;
    content: string;
    category?: string;
    tags?: string[];
  }[];
}

function getClient() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OpenAI is not configured.");
  }
  return new OpenAI({apiKey: env.OPENAI_API_KEY});
}

function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function extractJson(text: string): ConfidenceScore {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned);
  const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
  return {
    score,
    level: getConfidenceLevel(score),
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String).slice(0, 5) : [],
  };
}

export async function scoreReplyConfidence(input: ConfidenceInput): Promise<ConfidenceScore> {
  const email = input.email.trim();
  const reply = input.reply.trim();

  if (!email) throw new Error("Customer email is required for confidence scoring.");
  if (!reply) throw new Error("Reply is required for confidence scoring.");

  const knowledgeBase = (input.knowledgeBase ?? [])
    .map((article) => [`Title: ${article.title}`, `Category: ${article.category ?? "general"}`, `Tags: ${(article.tags ?? []).join(", ")}`, `Content: ${article.content}`].join("\n"))
    .join("\n\n");

  const prompt = `You are a confidence scorer for an AI customer email assistant.

Evaluate how confidently the proposed reply answers the customer's email.

Consider:
- How clearly the customer's request is understood.
- How strongly the reply is supported by the provided Knowledge Base.
- Whether important claims are grounded in the Knowledge Base.
- Whether the reply avoids unsupported assumptions.
- Whether the reply directly addresses the customer's request.
- Whether important information is missing.
- Whether ambiguity in the customer's request should reduce confidence.

Important:
- Confidence measures how reliable and well-supported the proposed answer is.
- Confidence is NOT the same as policy compliance.
- A reply can be policy compliant but still have low confidence if the Knowledge Base does not provide enough information.
- Do not penalize normal politeness or writing style.
- Do not invent information.
- Use a score from 0 to 100.
- 75–100 = high confidence.
- 50–74 = medium confidence.
- 0–49 = low confidence.

Return ONLY valid JSON with this exact structure:
{
  "score": 92,
  "reasons": [
    "The customer's request is clearly understood.",
    "The response is strongly supported by the Knowledge Base."
  ]
}

Customer email:
${email}

Proposed reply:
${reply}

Knowledge Base:
${knowledgeBase || "No relevant Knowledge Base information was found."}`;

  const response = await getClient().chat.completions.create({
    model: env.OPENAI_MODEL ?? "gpt-5.6",
    messages: [
      {role: "system", content: "You are a precise confidence scorer. Return only valid JSON."},
      {role: "user", content: prompt},
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Confidence scorer returned an empty response.");

  try {
    return extractJson(content);
  } catch {
    throw new Error("Confidence scorer returned invalid JSON.");
  }
}
