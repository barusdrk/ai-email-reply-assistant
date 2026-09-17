import {describe, expect, it, vi} from "vitest";
import {scoreReplyConfidence} from "../services/confidenceScoring.js";

const createMockResponse = (content: string) => ({
  choices: [{message: {content}}],
});

const mockCreate = vi.fn();

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
  }),
}));

vi.mock("../config/env.js", () => ({
  env: {
    OPENAI_API_KEY: "test-api-key",
    OPENAI_MODEL: "test-model",
  },
}));

function mockConfidenceResponse(score: number, reasons: string[] = ["The reply is sufficiently supported."]) {
  mockCreate.mockResolvedValueOnce(createMockResponse(JSON.stringify({score, reasons})));
}

describe("confidenceScoring", () => {
  it("rejects an empty customer email", async () => {
    await expect(scoreReplyConfidence({email: "   ", reply: "Thank you for contacting us."})).rejects.toThrow("Customer email is required for confidence scoring.");
  });

  it("rejects an empty reply", async () => {
    await expect(scoreReplyConfidence({email: "customer@example.com", reply: "   "})).rejects.toThrow("Reply is required for confidence scoring.");
  });

  it("returns a high-confidence score", async () => {
    mockConfidenceResponse(92, ["The reply is well supported."]);
    const result = await scoreReplyConfidence({
      email: "Can you tell me when my order will arrive?",
      reply: "Your order is expected to arrive within 3 business days.",
      knowledgeBase: [{title: "Shipping", content: "Orders normally arrive within 3 business days.", category: "shipping", tags: ["delivery"]}],
    });
    expect(result.score).toBe(92);
    expect(result.level).toBe("high");
    expect(result.reasons).toEqual(["The reply is well supported."]);
  });

  it("includes Knowledge Base information in the scoring request", async () => {
    mockConfidenceResponse(95, ["The response is supported by the shipping policy."]);
    const result = await scoreReplyConfidence({
      email: "Where is my order?",
      reply: "Your order is currently in transit.",
      knowledgeBase: [{title: "Shipping Policy", content: "Customers can track orders using the tracking number.", category: "shipping", tags: ["tracking", "delivery"]}],
    });
    expect(result.score).toBe(95);
    expect(result.level).toBe("high");
    expect(mockCreate).toHaveBeenCalled();
    const request = mockCreate.mock.calls.at(-1)?.[0];
    expect(request.messages[1].content).toContain("Shipping Policy");
    expect(request.messages[1].content).toContain("Customers can track orders using the tracking number.");
    expect(request.messages[1].content).toContain("shipping");
    expect(request.messages[1].content).toContain("tracking, delivery");
  });

  it("clamps scores above 100", async () => {
    mockConfidenceResponse(150);
    const result = await scoreReplyConfidence({
      email: "Can I update my account?",
      reply: "Yes, you can update your account details.",
    });
    expect(result.score).toBe(100);
    expect(result.level).toBe("high");
  });

  it("clamps scores below 0", async () => {
    mockConfidenceResponse(-20);
    const result = await scoreReplyConfidence({
      email: "Can I update my account?",
      reply: "Yes, you can update your account details.",
    });
    expect(result.score).toBe(0);
    expect(result.level).toBe("low");
  });

  it("limits confidence reasons to five items", async () => {
    mockConfidenceResponse(85, ["One", "Two", "Three", "Four", "Five", "Six"]);
    const result = await scoreReplyConfidence({
      email: "I need help with my account.",
      reply: "We can help you with your account.",
    });
    expect(result.reasons).toHaveLength(5);
    expect(result.reasons).toEqual(["One", "Two", "Three", "Four", "Five"]);
  });

  it("returns low confidence when the AI returns a low score", async () => {
    mockConfidenceResponse(40, ["The Knowledge Base does not contain enough information."]);
    const result = await scoreReplyConfidence({
      email: "Can you make an exception to my contract?",
      reply: "We can definitely make that exception.",
    });
    expect(result.score).toBe(40);
    expect(result.level).toBe("low");
  });

  it("returns medium confidence for a medium score", async () => {
    mockConfidenceResponse(70, ["The request is understood but additional information may be required."]);
    const result = await scoreReplyConfidence({
      email: "Can you help me with my subscription?",
      reply: "We can help you with your subscription.",
    });
    expect(result.score).toBe(70);
    expect(result.level).toBe("medium");
  });

  it("classifies 75 as high confidence", async () => {
    mockConfidenceResponse(75);
    const result = await scoreReplyConfidence({
      email: "Where is my order?",
      reply: "Your order is being processed.",
    });
    expect(result.score).toBe(75);
    expect(result.level).toBe("high");
  });

  it("classifies 74 as medium confidence", async () => {
    mockConfidenceResponse(74);
    const result = await scoreReplyConfidence({
      email: "Where is my order?",
      reply: "Your order is being processed.",
    });
    expect(result.score).toBe(74);
    expect(result.level).toBe("medium");
  });

  it("classifies 50 as medium confidence", async () => {
    mockConfidenceResponse(50);
    const result = await scoreReplyConfidence({
      email: "Can you make an exception?",
      reply: "We may be able to help.",
    });
    expect(result.score).toBe(50);
    expect(result.level).toBe("medium");
  });

  it("classifies 49 as low confidence", async () => {
    mockConfidenceResponse(49);
    const result = await scoreReplyConfidence({
      email: "Can you make an exception to my contract?",
      reply: "We can definitely make that exception.",
    });
    expect(result.score).toBe(49);
    expect(result.level).toBe("low");
  });

  it("accepts JSON wrapped in a markdown code block", async () => {
    mockCreate.mockResolvedValueOnce(createMockResponse('```json\n{"score": 85, "reasons": ["The answer is supported."]}\n```'));
    const result = await scoreReplyConfidence({
      email: "What is your shipping time?",
      reply: "Shipping normally takes 3 business days.",
    });
    expect(result.score).toBe(85);
    expect(result.level).toBe("high");
    expect(result.reasons).toEqual(["The answer is supported."]);
  });

  it("throws when the AI returns invalid JSON", async () => {
    mockCreate.mockResolvedValueOnce(createMockResponse("This is not valid JSON."));
    await expect(scoreReplyConfidence({
      email: "Where is my order?",
      reply: "Your order is being processed.",
    })).rejects.toThrow("Confidence scorer returned invalid JSON.");
  });

  it("throws when the AI returns an empty response", async () => {
    mockCreate.mockResolvedValueOnce(createMockResponse(""));
    await expect(scoreReplyConfidence({
      email: "Where is my order?",
      reply: "Your order is being processed.",
    })).rejects.toThrow("Confidence scorer returned an empty response.");
  });

  it("uses the configured OpenAI model", async () => {
    mockConfidenceResponse(90, ["Supported response."]);
    await scoreReplyConfidence({
      email: "What are your support hours?",
      reply: "Our support team is available during business hours.",
    });
    expect(mockCreate).toHaveBeenCalled();
    expect(mockCreate.mock.calls.at(-1)?.[0]).toMatchObject({model: "test-model"});
  });
});
