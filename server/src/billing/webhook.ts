import Stripe from "stripe";

import { env } from "../config/env.js";
import { requireStripe } from "./stripe.js";

import {
  subscriptionRepository,
} from "../repositories/SubscriptionRepository.js";

export async function handleStripeWebhook(
  payload: Buffer,
  signature: string
) {
  const stripe =
    requireStripe();

  if (
    !env.STRIPE_WEBHOOK_SECRET
  ) {
    throw new Error(
      "Missing STRIPE_WEBHOOK_SECRET."
    );
  }

  const event =
    stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );

  switch (event.type) {

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription =
        event.data.object;

      await subscriptionRepository
        .updateBySubscriptionId(
          subscription.id,
          {
            status:
              subscription.status === "active"
                ? "active"
                : "expired",
          }
        );

      break;
    }


    case "customer.subscription.deleted": {
      const subscription =
        event.data.object;

      await subscriptionRepository
        .updateBySubscriptionId(
          subscription.id,
          {
            status:
              "cancelled",
          }
        );

      break;
    }


    case "invoice.payment_failed": {
      const invoice =
        event.data.object;

      const subscriptionId =
        invoice.parent
          ?.subscription_details
          ?.subscription;

      if (
        typeof subscriptionId === "string"
      ) {
        await subscriptionRepository
          .updateBySubscriptionId(
            subscriptionId,
            {
              status:
                "expired",
            }
          );
      }

      break;
    }
  }

  return event;
}
