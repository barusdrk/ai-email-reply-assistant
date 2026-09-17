import type {SupportEngineResult} from "./supportEngine.js";

export const SUPPORT_CATEGORIES = [
  "general_support",
  "billing",
  "technical",
  "account",
  "sales",
  "refund",
  "cancellation",
  "shipping",
  "complaint",
  "other",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export function normalizeSupportCategory(value: unknown): SupportCategory {
  if (typeof value !== "string") return "general_support";
  const category = value.trim().toLowerCase();
  return (SUPPORT_CATEGORIES as readonly string[]).includes(category)
    ? category as SupportCategory
    : "other";
}

export function validateSupportResult(result: SupportEngineResult): string[] {
  const errors: string[] = [];

  if (!["reply", "human_review", "reject"].includes(result.decision)) {
    errors.push("Invalid support decision.");
  }

  if (!Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1) {
    errors.push("Confidence must be between 0 and 1.");
  }

  if (!result.category?.trim()) {
    errors.push("Support category is required.");
  }

  if (!["positive", "neutral", "negative", "urgent"].includes(result.sentiment)) {
    errors.push("Invalid support sentiment.");
  }

  if (typeof result.needsHuman !== "boolean") {
    errors.push("needsHuman must be a boolean.");
  }

  if (!Array.isArray(result.suggestedActions)) {
    errors.push("suggestedActions must be an array.");
  }

  if (!Array.isArray(result.missingInformation)) {
    errors.push("missingInformation must be an array.");
  }

  if (!Array.isArray(result.policyIssues)) {
    errors.push("policyIssues must be an array.");
  }

  if (result.decision === "reply" && result.needsHuman && result.reply.trim()) {
    errors.push("A human-review result should not contain an automatic reply.");
  }

  if (result.decision === "reply" && !result.needsHuman && !result.reply.trim()) {
    errors.push("A reply decision requires a customer-ready reply.");
  }

  if (result.decision !== "reply" && result.reply.trim()) {
    errors.push("Non-reply decisions must not contain an automatic reply.");
  }

  if (result.policyIssues.length > 0 && !result.needsHuman) {
    errors.push("Policy issues require human review.");
  }

  if (result.confidence < 0.75 && !result.needsHuman) {
    errors.push("Low-confidence results require human review.");
  }

  return errors;
}

export function isSafeForAutomaticReply(result: SupportEngineResult): boolean {
  return result.decision === "reply" &&
    !result.needsHuman &&
    result.confidence >= 0.75 &&
    result.policyIssues.length === 0 &&
    Boolean(result.reply.trim());
}
