import { env } from "../config/env.js";
import { requireStripe } from "./stripe.js";

export async function createPortalSession(
  customerId: string
) {
  const stripe =
    requireStripe();

  const session =
    await stripe.billingPortal.sessions.create({
      customer:
        customerId,

      return_url:
        `${env.CLIENT_URL}/billing`,
    });

  return session;
}
