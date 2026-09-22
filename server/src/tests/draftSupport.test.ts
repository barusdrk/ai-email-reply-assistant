import {describe, expect, it} from "vitest";
import {applySupportDecision} from "../services/draftSupport.js";
import type {SupportEngineResult} from "../services/supportEngine.js";

function createSupportResult(overrides: Partial<SupportEngineResult> = {}): SupportEngineResult {
  return {
    decision: "reply",
    confidence: 0.92,
    category: "billing",
    sentiment: "neutral",
    needsHuman: false,
    reason: "The request can be handled automatically.",
    reply: "Your payment was successfully processed.",
    suggestedActions: [],
    missingInformation: [],
    policyIssues: [],
    ...overrides,
  };
}

describe("draftSupport", () => {
  it("keeps a safe automatic action", () => {
    const action = {
      action: "auto_approve" as const,
      reasons: ["High AI confidence."],
    };

    const result = applySupportDecision(action, createSupportResult());

    expect(result.action).toBe("auto_approve");
    expect(result.reasons).toEqual(["High AI confidence."]);
  });

  it("escalates when support requires human review", () => {
    const action = {
      action: "pending" as const,
      reasons: ["Human approval is required."],
    };

    const result = applySupportDecision(
      action,
      createSupportResult({
        decision: "human_review",
        needsHuman: true,
        reply: "",
        reason: "The customer request requires manual review.",
        missingInformation: ["Order ID"],
      }),
    );

    expect(result.action).toBe("pending");
    expect(result.reasons).toContain("The customer request requires manual review.");
    expect(result.reasons).toContain("Order ID");
  });

  it("blocks rejected support requests", () => {
    const action = {
      action: "pending" as const,
      reasons: ["Human approval is required."],
    };

    const result = applySupportDecision(
      action,
      createSupportResult({
        decision: "reject",
        needsHuman: true,
        reply: "",
        reason: "The request should not receive an automated response.",
      }),
    );

    expect(result.action).toBe("blocked");
    expect(result.reasons).toContain("The request should not receive an automated response.");
  });

  it("blocks policy violations", () => {
    const action = {
      action: "auto_approve" as const,
      reasons: ["High AI confidence."],
    };

    const result = applySupportDecision(
      action,
      createSupportResult({
        needsHuman: true,
        reply: "",
        policyIssues: ["Refund exceeds the allowed amount."],
      }),
    );

    expect(result.action).toBe("blocked");
    expect(result.reasons).toContain("Refund exceeds the allowed amount.");
  });

  it("provides a fallback reason when human review has no reason", () => {
    const action = {
      action: "pending" as const,
      reasons: [],
    };

    const result = applySupportDecision(
      action,
      createSupportResult({
        decision: "human_review",
        needsHuman: true,
        reply: "",
        reason: "",
      }),
    );

    expect(result.action).toBe("pending");
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
