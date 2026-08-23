import { subscriptionRepository } from "../repositories/SubscriptionRepository.js";
import {
  createAIProvider,
  type AIProviderName,
} from "../ai/factory.js";
import type {
  ReplyLength,
  Tone,
} from "../ai/types.js";
import type { AIProvider } from "../ai/types.js";

type Plan =
  | "free"
  | "starter"
  | "pro";

export interface GenerateReplyInput {
  userId: string;
  email: string;
  tone?: Tone;
  length?: ReplyLength;
  signature?: string;
}

function getProviderName(
  plan: Plan
): AIProviderName {
  switch (plan) {
    case "pro":
      return "openai";
    case "starter":
    case "free":
    default:
      return "gemini";
  }
}

async function getUserProvider(
  userId: string
): Promise<AIProvider> {
  const subscription =
    await subscriptionRepository.findByUser(
      userId
    );

  const plan: Plan =
    subscription?.plan === "pro"
      ? "pro"
      : subscription?.plan === "starter"
        ? "starter"
        : "free";

  return createAIProvider(
    getProviderName(plan)
  );
}

export async function generateReply(
  input: GenerateReplyInput
): Promise<string> {
  const provider =
    await getUserProvider(input.userId);

  return provider.generateReply({
    email: input.email,
    tone:
      input.tone ??
      "professional",
    length:
      input.length ??
      "medium",
    signature:
      input.signature,
  });
}

export async function summarizeEmail(
  userId: string,
  email: string
): Promise<string> {
  const provider =
    await getUserProvider(userId);

  return provider.summarize({
    text: email,
  });
}

export async function classifyEmail(
  userId: string,
  email: string
): Promise<string> {
  const provider =
    await getUserProvider(userId);

  const result =
    await provider.summarize({
      text:
        `Classify the following email into one short category such as ` +
        `"support", "sales", "billing", "feedback", "urgent", or "other". ` +
        `Return only the category.\n\n${email}`,
    });

  return result.trim();
}
