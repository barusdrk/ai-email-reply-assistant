import OpenAI from "openai";
import {env} from "../config/env.js";

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
  return new OpenAI({apiKey: env.OPENAI_API_KEY});
}

function extractJson(text: string): PolicyCheckResult {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned);
  const violations = Array.isArray(parsed.violations) ? parsed.violations.map(String).slice(0, 10) : [];
  const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.map(String).slice(0, 10) : [];
  const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String).slice(0, 10) : [];
  const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
  return {
    compliant: violations.length === 0 && Boolean(parsed.compliant),
    score,
    violations,
    warnings,
    suggestions,
  };
}

function detectDeterministicPolicyIssues(email: string, reply: string): PolicyCheckResult {
  const text = `${email}\n${reply}`.toLowerCase();
  const violations: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const sensitiveRules = [
    {
      patterns: ["chargeback", "payment dispute", "dispute this payment"],
      reason: "Chargeback or payment dispute requires human review.",
    },
    {
      patterns: ["lawsuit", "legal action", "my lawyer", "attorney", "legal dispute"],
      reason: "Legal issue requires human review.",
    },
    {
      patterns: ["hacked", "account compromised", "security breach", "someone accessed my account"],
      reason: "Account security issue requires human review.",
    },
    {
      patterns: ["personal data", "delete my data", "privacy request", "gdpr", "data protection"],
      reason: "Privacy or personal-data request requires human review.",
    },
  ];

  for (const rule of sensitiveRules) {
    if (rule.patterns.some((pattern) => text.includes(pattern))) warnings.push(rule.reason);
  }

  if (/\b(refund|money back|reimburse)\b/i.test(text)) warnings.push("Refund request requires policy verification before automatic handling.");
  if (/\b(cancel|cancellation|terminate subscription)\b/i.test(text)) warnings.push("Cancellation request requires policy verification before automatic handling.");
  if (/\b(password|login|log in|sign in|access my account)\b/i.test(text)) warnings.push("Account access request requires careful verification before automatic handling.");

  if (warnings.length > 0) suggestions.push("Route the conversation to human review before sending an automatic response.");

  return {
    compliant: true,
    score: warnings.length > 0 ? 75 : 100,
    violations,
    warnings,
    suggestions,
  };
}

export async function checkReplyPolicy(input: PolicyCheckInput): Promise<PolicyCheckResult> {
  const email = input.email.trim();
  const reply = input.reply.trim();

  if (!email) throw new Error("Customer email is required for policy checking.");
  if (!reply) throw new Error("Reply is required for policy checking.");

  const knowledgeBase = (input.knowledgeBase ?? []).map((article) => [
    `Title: ${article.title}`,
    `Category: ${article.category ?? "general"}`,
    `Tags: ${(article.tags ?? []).join(", ")}`,
    `Content: ${article.content}`,
  ].join("\n")).join("\n\n");

  const deterministicResult = detectDeterministicPolicyIssues(email, reply);

  const prompt = `You are a policy compliance checker for an AI customer email assistant.

Your task is to check whether the proposed reply follows the provided company Knowledge Base and support policies.

Rules:
- Treat the Knowledge Base as the authoritative source for company-specific policies.
- Do not assume information that is not present in the Knowledge Base.
- Flag contradictions with the Knowledge Base.
- Flag invented policies, prices, discounts, deadlines, guarantees, processing times, refunds, or other unsupported claims.
- Flag promises that the company has not explicitly authorized.
- Flag claims that cannot be supported by the provided Knowledge Base.
- Do not flag normal polite language as a violation.
- If there is not enough information to verify a claim, use a warning rather than inventing a violation.
- A refund, cancellation, billing dispute, legal issue, account-security issue, privacy request, or other sensitive request may require human review even when the reply itself does not violate a policy.
- Score the reply from 0 to 100, where 100 means fully compliant and well supported.
- Set compliant to false when there is a clear policy violation or contradiction.
- Keep violations for actual policy violations.
- Keep warnings for uncertainty or cases requiring human review.
- Do not treat warnings as violations.

Return ONLY valid JSON with this exact structure:
{
  "compliant": true,
  "score": 100,
  "violations": [],
  "warnings": [],
  "suggestions": []
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
      {role: "system", content: "You are a precise policy compliance checker. Return only valid JSON."},
      {role: "user", content: prompt},
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Policy checker returned an empty response.");

  let aiResult: PolicyCheckResult;
  try {
    aiResult = extractJson(content);
  } catch {
    throw new Error("Policy checker returned invalid JSON.");
  }

  const violations = [...new Set([...deterministicResult.violations, ...aiResult.violations])].slice(0, 10);
  const warnings = violations.length > 0
    ? aiResult.warnings.filter((warning) => !warning.toLowerCase().includes("requires policy verification")).slice(0, 10)
    : [...new Set([...deterministicResult.warnings, ...aiResult.warnings])].slice(0, 10);
  const suggestions = violations.length > 0
    ? [...new Set([...aiResult.suggestions])].slice(0, 10)
    : [...new Set([...deterministicResult.suggestions, ...aiResult.suggestions])].slice(0, 10);

  const score = aiResult.violations.length > 0
    ? aiResult.score
    : violations.length > 0
      ? 0
      : Math.min(aiResult.score, deterministicResult.score);

  return {
    compliant: violations.length === 0 && aiResult.compliant,
    score,
    violations,
    warnings,
    suggestions,
  };
}
