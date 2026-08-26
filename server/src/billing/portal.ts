import type Stripe from "stripe";
import { env } from "../config/env.js";
import { requireStripe } from "./stripe.js";

export async function createPortalSession(
  customerId: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = requireStripe();

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.CLIENT_URL}/billing`
  });
}
