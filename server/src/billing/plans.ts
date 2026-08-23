import type { AIProviderName } from "../ai/types.js";

export const BILLING_AI_PROVIDERS = [
  "openai",
  "gemini",
  "groq",
  "claude",
] as const satisfies readonly Exclude<
  AIProviderName,
  "mock"
>[];

export type BillingAIProvider =
  typeof BILLING_AI_PROVIDERS[number];

export const PLANS = {
  free: {
    name: "Free",
    dailyLimit: 5,
    providers: BILLING_AI_PROVIDERS,
  },
  starter: {
    name: "Starter",
    dailyLimit: 100,
    providers: BILLING_AI_PROVIDERS,
  },
  pro: {
    name: "Pro",
    dailyLimit: 1000,
    providers: BILLING_AI_PROVIDERS,
  },
} as const;

export type PlanName =
  keyof typeof PLANS;
