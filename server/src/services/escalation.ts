import type { ConfidenceScore } from "../ai/types.js";
import type { PolicyCheckResult } from "./policyChecker.js";

export interface EscalationResult {
  escalated: boolean;
  reasons: string[];
}

const SENSITIVE_PATTERNS = [
  { pattern: /\brefund\b/i, reason: "Refund request detected." },
  { pattern: /\bchargeback\b/i, reason: "Chargeback or payment dispute detected." },
  { pattern: /\bcancel(?:lation)?\b/i, reason: "Cancellation request detected." },
  { pattern: /\blegal\b|\blawyer\b|\battorney\b/i, reason: "Legal issue detected." },
  { pattern: /\bsue\b|\blawsuit\b|\bcourt\b/i, reason: "Potential legal dispute detected." },
  { pattern: /\bcomplaint\b|\bcomplain\b/i, reason: "Customer complaint detected." },
  { pattern: /\bsecurity\b|\bhacked\b|\bcompromised\b/i, reason: "Account security issue detected." },
  { pattern: /\bpassword\b|\bcredential\b|\blogin\b/i, reason: "Account access issue detected." },
  { pattern: /\bprivacy\b|\bpersonal data\b|\bdata request\b/i, reason: "Privacy or personal-data request detected." },
  { pattern: /\bpayment\b|\bbilling\b|\binvoice\b/i, reason: "Billing or payment issue detected." },
];

export function determineEscalation(
  email: string,
  confidence: ConfidenceScore,
  policy?: PolicyCheckResult
): EscalationResult {
  const reasons: string[] = [];

  if (confidence.level === "low") {
    reasons.push(`Low AI confidence: ${confidence.score}/100.`);
  }

  for (const item of SENSITIVE_PATTERNS) {
    if (item.pattern.test(email)) {
      reasons.push(item.reason);
    }
  }

  if (policy && policy.warnings.length > 0) {
    reasons.push("Policy review warning requires human review.");
  }

  return {
    escalated: reasons.length > 0,
    reasons,
  };
}
