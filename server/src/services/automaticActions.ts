import type { ConfidenceScore } from "../ai/types.js";
import type { PolicyCheckResult } from "./policyChecker.js";
import { determineEscalation } from "./escalation.js";

export type AutomaticAction = "auto_approve" | "pending" | "escalate" | "blocked";

export interface AutomaticActionResult {
  action: AutomaticAction;
  reasons: string[];
}

export function determineAutomaticAction(
  email: string,
  confidence: ConfidenceScore,
  policy: PolicyCheckResult
): AutomaticActionResult {
  if (!policy.compliant || policy.violations.length > 0) {
    return {
      action: "blocked",
      reasons: policy.violations.length > 0
        ? policy.violations
        : ["Policy check failed."],
    };
  }

  const escalation = determineEscalation(email, confidence, policy);

  if (escalation.escalated) {
    return {
      action: "escalate",
      reasons: escalation.reasons,
    };
  }

  if (confidence.level === "high") {
    return {
      action: "auto_approve",
      reasons: [
        `High AI confidence: ${confidence.score}/100.`,
        "No escalation conditions detected.",
        "Policy check passed.",
      ],
    };
  }

  return {
    action: "pending",
    reasons: [
      `AI confidence is ${confidence.level}: ${confidence.score}/100.`,
      "Human approval is required.",
    ],
  };
}
