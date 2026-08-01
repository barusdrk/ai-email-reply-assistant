import Stripe from "stripe";

import { env } from "../config/env.js";

export const stripe =
  env.STRIPE_SECRET_KEY
    ? new Stripe(
        env.STRIPE_SECRET_KEY
      )
    : null;

export function requireStripe() {
  if (!stripe) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY."
    );
  }

  return stripe;
}

export function isStripeEnabled() {
  return stripe !== null;
}
