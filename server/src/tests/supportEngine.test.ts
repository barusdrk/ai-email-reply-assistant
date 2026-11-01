import {describe, expect, it} from "vitest";
import {CONFIDENCE_THRESHOLD, getAccountAccessReviewReason} from "../services/supportEngine.js";

describe("supportEngine", () => {
  it("uses the expected automatic-response confidence threshold", () => {
    expect(CONFIDENCE_THRESHOLD).toBe(0.75);
  });

  it("keeps the confidence threshold within a valid range", () => {
    expect(CONFIDENCE_THRESHOLD).toBeGreaterThan(0);
    expect(CONFIDENCE_THRESHOLD).toBeLessThanOrEqual(1);
  });

  it("requires at least 75% confidence for automatic responses", () => {
    expect(0.74).toBeLessThan(CONFIDENCE_THRESHOLD);
    expect(0.75).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD);
  });

  it("exports the support engine confidence threshold", () => {
    expect(typeof CONFIDENCE_THRESHOLD).toBe("number");
  });

  it("identifies account-access requests that require human review", () => {
    expect(getAccountAccessReviewReason(
      "I already tried resetting my password, but I never received the reset email.",
      [{title:"Password Reset",content:"Use the password-reset option on the login page."}],
    )).toContain("already attempted password recovery");

    expect(getAccountAccessReviewReason(
      "How can I change my password?",
      [{title:"Account Settings",content:"Customers can update profile information from Account Settings."}],
    )).toContain("does not document a password-change procedure");
  });
});
