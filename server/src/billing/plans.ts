import type {AIProviderName} from "../ai/types.js";

export const BILLING_AI_PROVIDERS=[
  "openai",
  "gemini",
  "groq",
  "claude",
] as const satisfies readonly AIProviderName[];

export const FREE_BILLING_AI_PROVIDERS=[
  "groq",
] as const satisfies readonly AIProviderName[];

export type BillingAIProvider=typeof BILLING_AI_PROVIDERS[number];

export const PLANS={
  free:{
    name:"Free",
    dailyLimit:5,
    providers:FREE_BILLING_AI_PROVIDERS,
  },
  starter:{
    name:"Starter",
    dailyLimit:100,
    providers:BILLING_AI_PROVIDERS,
  },
  pro:{
    name:"Pro",
    dailyLimit:1000,
    providers:BILLING_AI_PROVIDERS,
  },
} as const;

export type PlanName=keyof typeof PLANS;
