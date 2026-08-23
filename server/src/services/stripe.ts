import Stripe from "stripe";
import { env } from "../config/env.js";
import type { Plan } from "./billing.js";

export const stripe =
  env.STRIPE_SECRET_KEY
    ? new Stripe(env.STRIPE_SECRET_KEY)
    : null;

function getPriceId(
  plan: Exclude<Plan, "free">
): string {
  if (
    plan === "starter" &&
    env.STRIPE_PRICE_STARTER
  ) {
    return env.STRIPE_PRICE_STARTER;
  }

  if (
    plan === "pro" &&
    env.STRIPE_PRICE_PRO
  ) {
    return env.STRIPE_PRICE_PRO;
  }

  throw new Error(
    `No Stripe price configured for ${plan}.`
  );
}

export async function createCheckoutSession(
  userId: string,
  plan: Exclude<Plan, "free">,
  customerEmail?: string
): Promise<{
  id: string;
  url: string;
}> {
  if (!stripe) {
    throw new Error(
      "Stripe is not configured. Add STRIPE_SECRET_KEY."
    );
  }

  const session =
    await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: customerEmail,
      line_items: [
        {
          price: getPriceId(plan),
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        plan,
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
      success_url:
        `${env.CLIENT_URL}/billing?success=true`,
      cancel_url:
        `${env.CLIENT_URL}/billing?cancelled=true`,
    });

  if (!session.url) {
    throw new Error(
      "Stripe did not return a checkout URL."
    );
  }

  return {
    id: session.id,
    url: session.url,
  };
}
