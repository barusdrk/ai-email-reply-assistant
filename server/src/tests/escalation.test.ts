import {describe, expect, it} from "vitest";
import {determineEscalation} from "../services/escalation.js";
import type {ConfidenceScore} from "../ai/types.js";
import type {PolicyCheckResult} from "../services/policyChecker.js";

function confidence(score: number, level: ConfidenceScore["level"] = score >= 80 ? "high" : score >= 60 ? "medium" : "low"): ConfidenceScore {
  return {score, level, reasons: []};
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

describe("escalation", () => {
  it("does not escalate a normal high-confidence email", () => {
    const result = determineEscalation("Can you tell me your opening hours?", confidence(95));
    expect(result.escalated).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it("escalates low-confidence replies", () => {
    const result = determineEscalation("Can you help me with this issue?", confidence(45));
    expect(result.escalated).toBe(true);
    expect(result.reasons).toContain("Low AI confidence: 45/100.");
  });

  it("escalates refund requests", () => {
    const result = determineEscalation("I would like a refund for my purchase.", confidence(95));
    expect(result.escalated).toBe(true);
    expect(result.reasons).toContain("Refund request detected.");
  });

  it("escalates chargeback disputes", () => {
    const result = determineEscalation("I want to file a chargeback for this payment.", confidence(95));
    expect(result.escalated).toBe(true);
    expect(result.reasons).toContain("Chargeback or payment dispute detected.");
  });

  it("escalates cancellation requests", () => {
    const result = determineEscalation("Please cancel my subscription.", confidence(95));
    expect(result.escalated).toBe(true);
    expect(result.reasons).toContain("Cancellation request detected.");
  });

  it("escalates legal issues", () => {
    const result = determineEscalation("I have spoken with my lawyer about this matter.", confidence(95));
    expect(result.escalated).toBe(true);
    expect(result.reasons).toContain("Legal issue detected.");
  });

  it("escalates potential lawsuits", () => {
    const result = determineEscalation("If this is not resolved, I will file a lawsuit.", confidence(95));
    expect(result.escalated).toBe(true);
    expect(result.reasons).toContain("Potential legal dispute detected.");
  });

  it("escalates customer complaints", () => {
    const result = determineEscalation("I want to make a formal complaint about this service.", confidence(95));
    expect(result.escalated).toBe(true);
    expect(result.reasons).toContain("Customer complaint detected.");
  });

  it("escalates account security issues", () => {
    const result = determineEscalation("My account was hacked and appears to be compromised.", confidence(95));
    expect(result.escalated).toBe(true);
    expect(result.reasons).toContain("Account security issue detected.");
  });

  it("escalates account access issues", () => {
    const result = determineEscalation("I cannot log in because I forgot my password.", confidence(95));
    expect(result.escalated).toBe(true);
    expect(result.reasons).toContain("Account access issue detected.");
  });

  it("escalates privacy requests", () => {
    const result = determineEscalation("I want to know how you use my personal data.", confidence(95));
    expect(result.escalated).toBe(true);
    expect(result.reasons).toContain("Privacy or personal-data request detected.");
  });

  it("escalates billing issues", () => {
    const result = determineEscalation("There is an incorrect charge on my invoice.", confidence(95));
    expect(result.escalated).toBe(true);
    expect(result.reasons).toContain("Billing or payment issue detected.");
  });

  it("escalates policy warnings", () => {
    const result = determineEscalation("Can you explain this charge?", confidence(95), policy(["The requested information could not be fully verified."]));
    expect(result.escalated).toBe(true);
    expect(result.reasons).toContain("Policy review warning requires human review.");
  });

  it("does not escalate when policy has no warnings", () => {
    const result = determineEscalation("Can you explain your business hours?", confidence(95), policy());
    expect(result.escalated).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it("preserves multiple escalation reasons", () => {
    const result = determineEscalation("I want a refund because my account was hacked and I will contact my lawyer.", confidence(45), policy(["The response requires human verification."]));
    expect(result.escalated).toBe(true);
    expect(result.reasons.length).toBe(5);
    expect(result.reasons).toContain("Low AI confidence: 45/100.");
    expect(result.reasons).toContain("Refund request detected.");
    expect(result.reasons).toContain("Account security issue detected.");
    expect(result.reasons).toContain("Legal issue detected.");
    expect(result.reasons).toContain("Policy review warning requires human review.");
  });

  it("escalation matching is case insensitive", () => {
    const result = determineEscalation("I NEED A REFUND AND MY ACCOUNT WAS HACKED.", confidence(90));
    expect(result.escalated).toBe(true);
    expect(result.reasons).toContain("Refund request detected.");
    expect(result.reasons).toContain("Account security issue detected.");
  });

  it("medium confidence alone does not escalate", () => {
    const result = determineEscalation("Could you tell me when my order will arrive?", confidence(70));
    expect(result.escalated).toBe(false);
    expect(result.reasons).toEqual([]);
  });
});
