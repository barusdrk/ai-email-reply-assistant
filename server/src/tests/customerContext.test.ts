import {describe, expect, it} from "vitest";
import {buildCustomerContext, getCustomerContextFromEmail, mergeCustomerContext} from "../services/customerContext.js";

describe("customerContext", () => {
  it("builds a normalized customer context", () => {
    const result = buildCustomerContext({
      email: " customer@example.com ",
      name: " Demo Customer ",
      plan: " Pro ",
      status: " Active ",
      accountId: " acc-123 ",
      metadata: {source: "crm"},
    });

    expect(result).toEqual({
      email: "customer@example.com",
      name: "Demo Customer",
      plan: "Pro",
      status: "Active",
      accountId: "acc-123",
      metadata: {source: "crm"},
    });
  });

  it("omits empty or invalid context values", () => {
    const result = buildCustomerContext({
      email: "   ",
      name: "",
      plan: " ",
      status: undefined,
      accountId: "",
      metadata: null as unknown as Record<string, unknown>,
    });

    expect(result).toEqual({});
  });

  it("merges customer contexts with later values taking precedence", () => {
    const result = mergeCustomerContext(
      {
        email: "customer@example.com",
        name: "Original Name",
        plan: "Basic",
        status: "Active",
        accountId: "acc-1",
        metadata: {source: "email", region: "EU"},
      },
      {
        name: "Updated Name",
        plan: "Pro",
        metadata: {region: "US", tier: "premium"},
      },
    );

    expect(result).toEqual({
      email: "customer@example.com",
      name: "Updated Name",
      plan: "Pro",
      status: "Active",
      accountId: "acc-1",
      metadata: {
        source: "email",
        region: "US",
        tier: "premium",
      },
    });
  });

  it("extracts customer context from email fields", () => {
    const result = getCustomerContextFromEmail({
      customerEmail: "customer@example.com",
      customerName: "Demo Customer",
      plan: "Pro",
      status: "Active",
      accountId: "acc-123",
      metadata: {source: "support"},
    });

    expect(result).toEqual({
      email: "customer@example.com",
      name: "Demo Customer",
      plan: "Pro",
      status: "Active",
      accountId: "acc-123",
      metadata: {source: "support"},
    });
  });

  it("falls back to sender fields when customer fields are unavailable", () => {
    const result = getCustomerContextFromEmail({
      senderEmail: "sender@example.com",
      senderName: "Sender Name",
      fromEmail: "from@example.com",
      fromName: "From Name",
    });

    expect(result).toEqual({
      email: "sender@example.com",
      name: "Sender Name",
    });
  });

  it("uses the fallback email when email fields are unavailable", () => {
    const result = getCustomerContextFromEmail(
      {
        subject: "Support request",
        body: "I need help with my account.",
      },
      " fallback@example.com ",
    );

    expect(result).toEqual({
      email: "fallback@example.com",
    });
  });

  it("returns an empty context for invalid email input", () => {
    expect(getCustomerContextFromEmail(null)).toEqual({});
    expect(getCustomerContextFromEmail(undefined)).toEqual({});
    expect(getCustomerContextFromEmail("invalid")).toEqual({});
  });
});
