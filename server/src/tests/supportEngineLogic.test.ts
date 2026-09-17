import {describe, expect, it} from "vitest";
import {CONFIDENCE_THRESHOLD, normalizeResult} from "../services/supportEngine.js";

describe("supportEngine logic", () => {
  it("keeps a safe high-confidence reply", () => {
    const result = normalizeResult({
      decision: "reply",
      confidence: 0.92,
      category: "billing",
      sentiment: "neutral",
      reason: "The request can be handled automatically.",
      reply: "Your payment was successfully processed.",
      suggestedActions: [],
      missingInformation: [],
      policyIssues: [],
    });

    expect(result.decision).toBe("reply");
    expect(result.confidence).toBe(0.92);
    expect(result.category).toBe("billing");
    expect(result.needsHuman).toBe(false);
    expect(result.reply).toBe("Your payment was successfully processed.");
  });

  it("moves a low-confidence reply to human review", () => {
    const result = normalizeResult({
      decision: "reply",
      confidence: CONFIDENCE_THRESHOLD - 0.01,
      category: "billing",
      sentiment: "neutral",
      reason: "The request is uncertain.",
      reply: "We believe your payment was processed.",
      suggestedActions: [],
      missingInformation: [],
      policyIssues: [],
    });

    expect(result.decision).toBe("human_review");
    expect(result.needsHuman).toBe(true);
    expect(result.reply).toBe("");
  });

  it("moves a reply with policy issues to human review", () => {
    const result = normalizeResult({
      decision: "reply",
      confidence: 0.95,
      category: "refund",
      sentiment: "negative",
      reason: "The request may require a policy exception.",
      reply: "We can issue the requested refund.",
      suggestedActions: [],
      missingInformation: [],
      policyIssues: ["Refund exceeds the allowed amount."],
    });

    expect(result.decision).toBe("human_review");
    expect(result.needsHuman).toBe(true);
    expect(result.reply).toBe("");
    expect(result.policyIssues).toContain("Refund exceeds the allowed amount.");
  });

  it("moves a response with missing reply to human review", () => {
    const result = normalizeResult({
      decision: "reply",
      confidence: 0.95,
      category: "account",
      sentiment: "neutral",
      reason: "The request needs clarification.",
      reply: "",
      suggestedActions: [],
      missingInformation: ["Account ID"],
      policyIssues: [],
    });

    expect(result.decision).toBe("human_review");
    expect(result.needsHuman).toBe(true);
    expect(result.reply).toBe("");
    expect(result.missingInformation).toContain("Account ID");
  });

  it("preserves an explicit human-review decision", () => {
    const result = normalizeResult({
      decision: "human_review",
      confidence: 0.9,
      category: "technical",
      sentiment: "negative",
      reason: "The issue requires specialist review.",
      reply: "A specialist will review your request.",
      suggestedActions: ["Review account logs"],
      missingInformation: [],
      policyIssues: [],
    });

    expect(result.decision).toBe("human_review");
    expect(result.needsHuman).toBe(true);
    expect(result.reply).toBe("");
    expect(result.reason).toBe("The issue requires specialist review.");
  });

  it("preserves an explicit reject decision", () => {
    const result = normalizeResult({
      decision: "reject",
      confidence: 0.98,
      category: "other",
      sentiment: "urgent",
      reason: "The request should not receive an automated response.",
      reply: "We cannot process this request.",
      suggestedActions: [],
      missingInformation: [],
      policyIssues: [],
    });

    expect(result.decision).toBe("reject");
    expect(result.needsHuman).toBe(true);
    expect(result.reply).toBe("");
    expect(result.reason).toBe("The request should not receive an automated response.");
  });

  it("normalizes an invalid category to general_support", () => {
    const result = normalizeResult({
      decision: "reply",
      confidence: 0.9,
      category: "unknown_category",
      sentiment: "neutral",
      reason: "The request can be handled automatically.",
      reply: "We can help with your request.",
      suggestedActions: [],
      missingInformation: [],
      policyIssues: [],
    });

    expect(result.category).toBe("general_support");
    expect(result.decision).toBe("reply");
  });

  it("normalizes an invalid sentiment to neutral", () => {
    const result = normalizeResult({
      decision: "reply",
      confidence: 0.9,
      category: "general_support",
      sentiment: "unknown_sentiment",
      reason: "The request can be handled automatically.",
      reply: "We can help with your request.",
      suggestedActions: [],
      missingInformation: [],
      policyIssues: [],
    });

    expect(result.sentiment).toBe("neutral");
    expect(result.decision).toBe("reply");
  });

  it("clamps confidence to the valid range", () => {
    const high = normalizeResult({
      decision: "reply",
      confidence: 5,
      category: "general_support",
      sentiment: "neutral",
      reason: "Safe request.",
      reply: "We can help with your request.",
      suggestedActions: [],
      missingInformation: [],
      policyIssues: [],
    });

    const low = normalizeResult({
      decision: "reply",
      confidence: -2,
      category: "general_support",
      sentiment: "neutral",
      reason: "Unsafe confidence.",
      reply: "We can help with your request.",
      suggestedActions: [],
      missingInformation: [],
      policyIssues: [],
    });

    expect(high.confidence).toBe(1);
    expect(low.confidence).toBe(0);
    expect(low.decision).toBe("human_review");
  });

  it("preserves suggested actions and missing information", () => {
    const result = normalizeResult({
      decision: "human_review",
      confidence: 0.7,
      category: "technical",
      sentiment: "negative",
      reason: "More information is required.",
      reply: "",
      suggestedActions: ["Check account logs", "Verify subscription status"],
      missingInformation: ["Account ID", "Error message"],
      policyIssues: [],
    });

    expect(result.suggestedActions).toEqual([
      "Check account logs",
      "Verify subscription status",
    ]);
    expect(result.missingInformation).toEqual([
      "Account ID",
      "Error message",
    ]);
    expect(result.decision).toBe("human_review");
    expect(result.reply).toBe("");
  });

  it("uses a fallback reason when the model provides no reason", () => {
    const result = normalizeResult({
      decision: "human_review",
      confidence: 0.6,
      category: "general_support",
      sentiment: "neutral",
      reason: "",
      reply: "",
      suggestedActions: [],
      missingInformation: [],
      policyIssues: [],
    });

    expect(result.reason).toBe("The request requires human review.");
    expect(result.decision).toBe("human_review");
    expect(result.needsHuman).toBe(true);
  });

  it("rejects an invalid reply decision when confidence is below the threshold", () => {
    const result = normalizeResult({
      decision: "reply",
      confidence: CONFIDENCE_THRESHOLD - 0.1,
      category: "billing",
      sentiment: "neutral",
      reason: "Low-confidence response.",
      reply: "Your billing issue has been resolved.",
      suggestedActions: [],
      missingInformation: [],
      policyIssues: [],
    });

    expect(result.decision).toBe("human_review");
    expect(result.needsHuman).toBe(true);
    expect(result.reply).toBe("");
  });
});
