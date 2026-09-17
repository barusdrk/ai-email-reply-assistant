import type {ConfidenceScore} from "../ai/types.js";
import type {PolicyCheckResult} from "./policyChecker.js";
import {determineEscalation} from "./escalation.js";

export type AutomaticAction = "auto_approve" | "pending" | "escalate" | "blocked";

export interface AutomaticActionResult {
  action: AutomaticAction;
  reasons: string[];
}

export function determineAutomaticAction(email: string, confidence: ConfidenceScore, policy: PolicyCheckResult): AutomaticActionResult {
  if (!policy.compliant || policy.violations.length > 0) {
    return {
      action: "blocked",
      reasons: policy.violations.length > 0 ? policy.violations : ["Policy check failed."],
    };
  }

  const escalation = determineEscalation(email, confidence, policy);

  if (escalation.escalated) {
    return {
      action: "escalate",
      reasons: escalation.reasons,
    };
  }

  if (confidence.level === "low") {
    return {
      action: "escalate",
      reasons: [
        `Low AI confidence: ${confidence.score}/100.`,
        "Automatic handling is not permitted for low-confidence requests.",
        "Human specialist escalation is required.",
      ],
    };
  }

  if (confidence.level === "medium") {
    return {
      action: "pending",
      reasons: [
        `Medium AI confidence: ${confidence.score}/100.`,
        "Human approval is required before the response can be sent.",
      ],
    };
  }

  if (confidence.level === "high") {
    return {
      action: "auto_approve",
      reasons: [
        `High AI confidence: ${confidence.score}/100.`,
        "The response is eligible for automatic approval.",
        "Policy check passed.",
      ],
    };
  }

  return {
    action: "pending",
    reasons: [
      `Unknown AI confidence level: ${confidence.level}.`,
      "Human approval is required.",
    ],
  };
}
