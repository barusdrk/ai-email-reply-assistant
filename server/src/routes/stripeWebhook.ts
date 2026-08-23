import {
  Router,
  type Request,
  type Response,
} from "express";
import Stripe from "stripe";
import { env } from "../config/env.js";
import { setPlan } from "../services/billing.js";

const router = Router();

const stripe =
  env.STRIPE_SECRET_KEY
    ? new Stripe(env.STRIPE_SECRET_KEY)
    : null;

function getPlan(
  subscription: Stripe.Subscription
): "free" | "starter" | "pro" {
  const priceId =
    subscription.items.data[0]?.price.id;

  if (priceId === env.STRIPE_PRICE_PRO) {
    return "pro";
  }

  if (priceId === env.STRIPE_PRICE_STARTER) {
    return "starter";
  }

  return "free";
}

function getSubscriptionId(
  value:
    | string
    | Stripe.Subscription
    | null
): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  return value?.id;
}

function getSubscriptionStatus(
  status: Stripe.Subscription.Status
): "active" | "cancelled" | "expired" {
  if (
    status === "active" ||
    status === "trialing"
  ) {
    return "active";
  }

  if (
    status === "canceled" ||
    status === "unpaid"
  ) {
    return "cancelled";
  }

  return "expired";
}

router.post(
  "/",
  async (
    req: Request,
    res: Response
  ) => {
    if (!stripe) {
      res.status(503).json({
        message:
          "Stripe is not configured.",
      });
      return;
    }

    if (!env.STRIPE_WEBHOOK_SECRET) {
      res.status(503).json({
        message:
          "Stripe webhook is not configured.",
      });
      return;
    }

    const signature =
      req.headers["stripe-signature"];

    if (typeof signature !== "string") {
      res.status(400).send(
        "Missing Stripe signature."
      );
      return;
    }

    let event: Stripe.Event;

    try {
      event =
        stripe.webhooks.constructEvent(
          req.body,
          signature,
          env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
      res.status(400).send(
        error instanceof Error
          ? error.message
          : "Invalid webhook."
      );
      return;
    }

    try {
      if (
        event.type ===
        "checkout.session.completed"
      ) {
        const session =
          event.data.object as
            Stripe.Checkout.Session;

        const userId =
          session.metadata?.userId;

        const plan =
          session.metadata?.plan;

        const subscriptionId =
          getSubscriptionId(
            session.subscription
          );

        if (
          userId &&
          (plan === "starter" ||
            plan === "pro")
        ) {
          await setPlan(
            userId,
            plan,
            subscriptionId,
            "active"
          );
        }
      }

      if (
        event.type ===
          "customer.subscription.updated" ||
        event.type ===
          "customer.subscription.deleted"
      ) {
        const subscription =
          event.data.object as
            Stripe.Subscription;

        const userId =
          subscription.metadata.userId;

        if (userId) {
          const deleted =
            event.type ===
            "customer.subscription.deleted";

          const plan =
            deleted
              ? "free"
              : getPlan(subscription);

          const status =
            deleted
              ? "cancelled"
              : getSubscriptionStatus(
                  subscription.status
                );

          await setPlan(
            userId,
            plan,
            deleted
              ? undefined
              : subscription.id,
            status
          );
        }
      }

      res.json({
        received: true,
      });
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      });
    }
  }
);

export default router;
