import test from "node:test";
import assert from "node:assert/strict";
import { determineEscalation } from "./escalation.js";
import type { ConfidenceScore } from "../ai/types.js";
import type { PolicyCheckResult } from "./policyChecker.js";

function confidence(
  score: number,
  level: ConfidenceScore["level"] = score >= 80 ? "high" : score >= 60 ? "medium" : "low"
): ConfidenceScore {
  return {
    score,
    level,
    reasons: [],
  };
}

function policy(warnings: string[] = [], violations: string[] = []): PolicyCheckResult {
  return {
    compliant: violations.length === 0,
    score: violations.length > 0 ? 0 : warnings.length > 0 ? 75 : 100,
    violations,
    warnings,
    suggestions: [],
  };
}

test("does not escalate a normal high-confidence email", () => {
  const result = determineEscalation(
    "Can you tell me your opening hours?",
    confidence(95)
  );

  assert.equal(result.escalated, false);
  assert.deepEqual(result.reasons, []);
});

test("escalates low-confidence replies", () => {
  const result = determineEscalation(
    "Can you help me with this issue?",
    confidence(45)
  );

  assert.equal(result.escalated, true);
  assert.ok(result.reasons.includes("Low AI confidence: 45/100."));
});

test("escalates refund requests", () => {
  const result = determineEscalation(
    "I would like a refund for my purchase.",
    confidence(95)
  );

  assert.equal(result.escalated, true);
  assert.ok(result.reasons.includes("Refund request detected."));
});

test("escalates chargeback disputes", () => {
  const result = determineEscalation(
    "I want to file a chargeback for this payment.",
    confidence(95)
  );

  assert.equal(result.escalated, true);
  assert.ok(result.reasons.includes("Chargeback or payment dispute detected."));
});

test("escalates cancellation requests", () => {
  const result = determineEscalation(
    "Please cancel my subscription.",
    confidence(95)
  );

  assert.equal(result.escalated, true);
  assert.ok(result.reasons.includes("Cancellation request detected."));
});

test("escalates legal issues", () => {
  const result = determineEscalation(
    "I have spoken with my lawyer about this matter.",
    confidence(95)
  );

  assert.equal(result.escalated, true);
  assert.ok(result.reasons.includes("Legal issue detected."));
});

test("escalates potential lawsuits", () => {
  const result = determineEscalation(
    "If this is not resolved, I will file a lawsuit.",
    confidence(95)
  );

  assert.equal(result.escalated, true);
  assert.ok(result.reasons.includes("Potential legal dispute detected."));
});

test("escalates customer complaints", () => {
  const result = determineEscalation(
    "I want to make a formal complaint about this service.",
    confidence(95)
  );

  assert.equal(result.escalated, true);
  assert.ok(result.reasons.includes("Customer complaint detected."));
});

test("escalates account security issues", () => {
  const result = determineEscalation(
    "My account was hacked and appears to be compromised.",
    confidence(95)
  );

  assert.equal(result.escalated, true);
  assert.ok(result.reasons.includes("Account security issue detected."));
});

test("escalates account access issues", () => {
  const result = determineEscalation(
    "I cannot log in because I forgot my password.",
    confidence(95)
  );

  assert.equal(result.escalated, true);
  assert.ok(result.reasons.includes("Account access issue detected."));
});

test("escalates privacy requests", () => {
  const result = determineEscalation(
    "I want to know how you use my personal data.",
    confidence(95)
  );

  assert.equal(result.escalated, true);
  assert.ok(result.reasons.includes("Privacy or personal-data request detected."));
});

test("escalates billing issues", () => {
  const result = determineEscalation(
    "There is an incorrect charge on my invoice.",
    confidence(95)
  );

  assert.equal(result.escalated, true);
  assert.ok(result.reasons.includes("Billing or payment issue detected."));
});

test("escalates policy warnings", () => {
  const result = determineEscalation(
    "Can you explain this charge?",
    confidence(95),
    policy(["The requested information could not be fully verified."])
  );

  assert.equal(result.escalated, true);
  assert.ok(
    result.reasons.includes("Policy review warning requires human review.")
  );
});

test("does not escalate when policy has no warnings", () => {
  const result = determineEscalation(
    "Can you explain your business hours?",
    confidence(95),
    policy()
  );

  assert.equal(result.escalated, false);
  assert.deepEqual(result.reasons, []);
});

test("preserves multiple escalation reasons", () => {
  const result = determineEscalation(
    "I want a refund because my account was hacked and I will contact my lawyer.",
    confidence(45),
    policy(["The response requires human verification."])
  );

  assert.equal(result.escalated, true);
  assert.equal(result.reasons.length, 5);
  assert.ok(result.reasons.includes("Low AI confidence: 45/100."));
  assert.ok(result.reasons.includes("Refund request detected."));
  assert.ok(result.reasons.includes("Account security issue detected."));
  assert.ok(result.reasons.includes("Legal issue detected."));
  assert.ok(
    result.reasons.includes("Policy review warning requires human review.")
  );
});

test("escalation matching is case insensitive", () => {
  const result = determineEscalation(
    "I NEED A REFUND AND MY ACCOUNT WAS HACKED.",
    confidence(90)
  );

  assert.equal(result.escalated, true);
  assert.ok(result.reasons.includes("Refund request detected."));
  assert.ok(result.reasons.includes("Account security issue detected."));
});

test("medium confidence alone does not escalate", () => {
  const result = determineEscalation(
    "Could you tell me when my order will arrive?",
    confidence(70)
  );

  assert.equal(result.escalated, false);
  assert.deepEqual(result.reasons, []);
});
