import type {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  subscriptionRepository,
} from "../repositories/SubscriptionRepository.js";

export type Plan =
  | "free"
  | "starter"
  | "pro";

export function requirePlan(
  plans: Plan[]
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message:
            "Unauthorized.",
        });
      }

      const subscription =
        await subscriptionRepository.findByUser(
          req.user.id
        );

      const currentPlan: Plan =
        subscription?.plan ??
        "free";

      if (
        !plans.includes(
          currentPlan
        )
      ) {
        return res.status(403).json({
          message:
            "Upgrade your plan to use this feature.",
          currentPlan,
          requiredPlans:
            plans,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Plan check failed.",
      });
    }
  };
}
