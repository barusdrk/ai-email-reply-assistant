import type Stripe from "stripe";
import { requireStripe } from "./stripe.js";
import { env } from "../config/env.js";

export async function createCheckoutSession(
  plan: "starter" | "pro",
  customerId?: string
): Promise<Stripe.Checkout.Session> {
  const stripe = requireStripe();
  const priceId = plan === "starter" ? env.STRIPE_PRICE_STARTER : env.STRIPE_PRICE_PRO;

  if (!priceId) {
    throw new Error("Stripe billing is disabled.");
  }

  return stripe.checkout.sessions.create({
    mode: "subscription",
    ...(customerId ? { customer: customerId } : {}),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.CLIENT_URL}/billing?success=true`,
    cancel_url: `${env.CLIENT_URL}/billing?cancelled=true`
  });
}
