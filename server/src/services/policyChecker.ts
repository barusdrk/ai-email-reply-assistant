import OpenAI from "openai";
import { env } from "../config/env.js";

export interface PolicyCheckInput {
  email: string;
  reply: string;
  knowledgeBase?: {
    title: string;
    content: string;
    category?: string;
    tags?: string[];
  }[];
}

export interface PolicyCheckResult {
  compliant: boolean;
  score: number;
  violations: string[];
  warnings: string[];
  suggestions: string[];
}

function getClient() {
  if (!env.OPENAI_API_KEY) throw new Error("OpenAI is not configured.");
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

function extractJson(text: string): PolicyCheckResult {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned);
  return {
    compliant: Boolean(parsed.compliant),
    score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
    violations: Array.isArray(parsed.violations) ? parsed.violations.map(String) : [],
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [],
  };
}

export async function checkReplyPolicy(input: PolicyCheckInput): Promise<PolicyCheckResult> {
  const knowledgeBase = (input.knowledgeBase ?? []).map((article) => [
    `Title: ${article.title}`,
    `Category: ${article.category ?? "general"}`,
    `Tags: ${(article.tags ?? []).join(", ")}`,
    `Content: ${article.content}`,
  ].join("\n")).join("\n\n");

  const prompt = `You are a policy compliance checker for an AI customer email assistant.

Your task is to check whether the proposed reply follows the provided company Knowledge Base.

Rules:
- Treat the Knowledge Base as the authoritative source for company-specific policies.
- Do not assume information that is not present in the Knowledge Base.
- Flag contradictions with the Knowledge Base.
- Flag invented policies, prices, discounts, deadlines, guarantees, processing times, refunds, or other unsupported claims.
- Flag promises that the company has not explicitly authorized.
- Do not flag normal polite language as a violation.
- If there is not enough information to verify a claim, use a warning rather than inventing a violation.
- Score the reply from 0 to 100, where 100 means fully compliant.
- Set compliant to false when there is a clear policy violation or contradiction.

Return ONLY valid JSON with this exact structure:
{
  "compliant": true,
  "score": 100,
  "violations": [],
  "warnings": [],
  "suggestions": []
}

Customer email:
${input.email}

Proposed reply:
${input.reply}

Knowledge Base:
${knowledgeBase || "No relevant Knowledge Base information was found."}`;

  const response = await getClient().chat.completions.create({
    model: env.OPENAI_MODEL ?? "gpt-5.6",
    messages: [
      { role: "system", content: "You are a precise policy compliance checker. Return only valid JSON." },
      { role: "user", content: prompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Policy checker returned an empty response.");

  try {
    return extractJson(content);
  } catch {
    throw new Error("Policy checker returned invalid JSON.");
  }
}
