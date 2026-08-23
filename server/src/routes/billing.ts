import {
  Router,
  type Request,
  type Response,
} from "express";
import { auth } from "../middleware/auth.js";
import {
  getSubscription,
  getPlan,
  getAIProvider,
  getPlanLimits,
  changePlan,
  type Plan,
} from "../services/billing.js";
import {
  createCheckoutSession,
} from "../services/stripe.js";

const router = Router();

const PAID_PLANS = [
  "starter",
  "pro",
] as const;

function isPaidPlan(
  plan: string
): plan is "starter" | "pro" {
  return PAID_PLANS.includes(
    plan as "starter" | "pro"
  );
}

router.use(auth);

router.get(
  "/subscription",
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({
          message: "Unauthorized",
        });
        return;
      }

      const subscription =
        await getSubscription(req.user.id);

      res.json(subscription);
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Failed to load subscription.",
      });
    }
  }
);

router.get(
  "/plan",
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({
          message: "Unauthorized",
        });
        return;
      }

      const plan =
        await getPlan(req.user.id);

      res.json({ plan });
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Failed to load plan.",
      });
    }
  }
);

router.get(
  "/provider",
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({
          message: "Unauthorized",
        });
        return;
      }

      const provider =
        await getAIProvider(req.user.id);

      res.json({ provider });
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Failed to load provider.",
      });
    }
  }
);

router.get(
  "/limits",
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({
          message: "Unauthorized",
        });
        return;
      }

      const plan =
        await getPlan(req.user.id);

      res.json(getPlanLimits(plan));
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Failed to load limits.",
      });
    }
  }
);

router.post(
  "/checkout",
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({
          message: "Unauthorized",
        });
        return;
      }

      const plan = req.body.plan as string;

      if (!isPaidPlan(plan)) {
        res.status(400).json({
          message:
            "Checkout is only available for Starter and Pro plans.",
        });
        return;
      }

      const session =
        await createCheckoutSession(
          req.user.id,
          plan,
          req.user.email
        );

      res.json(session);
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Failed to create checkout session.",
      });
    }
  }
);

router.post(
  "/change-plan",
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({
          message: "Unauthorized",
        });
        return;
      }

      const plan =
        req.body.plan as Plan;

      if (plan !== "free") {
        res.status(400).json({
          message:
            "Use Stripe Checkout to activate a paid plan.",
        });
        return;
      }

      const subscription =
        await changePlan(
          req.user.id,
          "free"
        );

      res.json(subscription);
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Failed to change plan.",
      });
    }
  }
);

export default router;
