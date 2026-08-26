import type Stripe from "stripe";
import { requireStripe } from "./stripe.js";
import { env } from "../config/env.js";
import { subscriptionRepository } from "../repositories/SubscriptionRepository.js";

export async function handleStripeWebhook(
  payload: Buffer,
  signature: string
): Promise<Stripe.Event> {
  const stripe = requireStripe();

  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Stripe webhook disabled.");
  }

  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object;

      await subscriptionRepository.updateBySubscriptionId(
        subscription.id,
        {
          status: subscription.status === "active" ? "active" : "expired"
        }
      );

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;

      await subscriptionRepository.updateBySubscriptionId(
        subscription.id,
        {
          status: "cancelled"
        }
      );

      break;
    }

    case "invoice.payment_failed": {
      break;
    }
  }

  return event;
}
