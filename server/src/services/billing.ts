import {
  Types,
} from "mongoose";

import {
  subscriptionRepository,
} from "../repositories/SubscriptionRepository.js";

export type Plan =
  | "free"
  | "starter"
  | "pro";

const PLANS = {
  free:{
    provider:"gemini",
    monthlyReplies:100,
  },

  starter:{
    provider:"gemini",
    monthlyReplies:1000,
  },

  pro:{
    provider:"openai",
    monthlyReplies:10000,
  },
} as const;

export async function getSubscription(
  userId:string
) {
  let subscription =
    await subscriptionRepository.findByUser(
      userId
    );

  if (!subscription) {
    subscription =
      await subscriptionRepository.create({
        userId:
          new Types.ObjectId(userId),
        plan:"free",
        status:"active",
        provider:"none",
      });
  }

  return subscription;
}

export async function getPlan(
  userId:string
):Promise<Plan> {
  const subscription =
    await getSubscription(
      userId
    );

  return subscription.plan;
}

export async function getAIProvider(
  userId:string
) {
  const plan =
    await getPlan(
      userId
    );

  return PLANS[plan].provider;
}

export async function canGenerateReply(
  userId:string
) {
  const subscription =
    await getSubscription(
      userId
    );

  return (
    subscription.status === "active"
  );
}

export function getPlanLimits(
  plan:Plan
) {
  return PLANS[plan];
}
