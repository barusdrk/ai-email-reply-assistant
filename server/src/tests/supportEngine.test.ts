import {describe, expect, it} from "vitest";
import {CONFIDENCE_THRESHOLD} from "../services/supportEngine.js";

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
});
