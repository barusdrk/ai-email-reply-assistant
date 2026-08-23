import { Types } from "mongoose";
import {
  subscriptionRepository,
} from "../repositories/SubscriptionRepository.js";
import type {
  AIProviderName,
} from "../ai/types.js";

export type Plan =
  | "free"
  | "starter"
  | "pro";

export type BillingProvider =
  | "none"
  | "stripe";

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

const PLANS = {
  free: {
    providers: BILLING_AI_PROVIDERS,
    monthlyReplies: 100,
  },
  starter: {
    providers: BILLING_AI_PROVIDERS,
    monthlyReplies: 1000,
  },
  pro: {
    providers: BILLING_AI_PROVIDERS,
    monthlyReplies: 10000,
  },
} as const;

function validateUserId(
  userId: string
) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }
}

function validatePlan(
  plan: Plan
) {
  if (!(plan in PLANS)) {
    throw new Error("Invalid plan.");
  }
}

export async function getSubscription(
  userId: string
) {
  validateUserId(userId);

  let subscription =
    await subscriptionRepository.findByUser(
      userId
    );

  if (!subscription) {
    subscription =
      await subscriptionRepository.create({
        userId: new Types.ObjectId(userId),
        plan: "free",
        status: "active",
        provider: "none",
      });
  }

  return subscription;
}

export async function getPlan(
  userId: string
): Promise<Plan> {
  const subscription =
    await getSubscription(userId);

  return subscription.plan as Plan;
}

export async function getAIProvider(
  userId: string
): Promise<BillingAIProvider> {
  const plan = await getPlan(userId);

  return PLANS[plan].providers[0];
}

export function getPlanLimits(
  plan: Plan
) {
  validatePlan(plan);

  return PLANS[plan];
}

export function getAvailableAIProviders(
  plan: Plan
): readonly BillingAIProvider[] {
  validatePlan(plan);

  return PLANS[plan].providers;
}

export async function setPlan(
  userId: string,
  plan: Plan,
  subscriptionId?: string,
  currentPeriodEnd?: Date | string
) {
  validateUserId(userId);
  validatePlan(plan);

  const provider: BillingProvider =
    plan === "free"
      ? "none"
      : "stripe";

  const currentPeriodStart =
    new Date();

  const periodEnd =
    currentPeriodEnd
      ? new Date(currentPeriodEnd)
      : undefined;

  return subscriptionRepository.update(
    userId,
    {
      plan,
      status: "active",
      provider,
      ...(subscriptionId
        ? { subscriptionId }
        : {}),
      currentPeriodStart,
      ...(periodEnd &&
      !Number.isNaN(periodEnd.getTime())
        ? {
            currentPeriodEnd:
              periodEnd,
          }
        : {}),
    }
  );
}

export async function changePlan(
  userId: string,
  plan: Plan
) {
  return setPlan(userId, plan);
}

export async function cancelSubscription(
  userId: string
) {
  validateUserId(userId);

  return subscriptionRepository.update(
    userId,
    {
      plan: "free",
      status: "cancelled",
      provider: "none",
    }
  );
}

export async function canGenerateReply(
  userId: string
) {
  const subscription =
    await getSubscription(userId);

  return subscription.status === "active";
}
