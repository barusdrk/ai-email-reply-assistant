import { Router } from "express";
import { auth } from "../middleware/auth.js";
import {
  getSubscription,
  getPlan,
  getAIProvider,
  getPlanLimits,
} from "../services/billing.js";

const router =
  Router();

router.use(auth);

router.get(
  "/subscription",
  async (req:any,res) => {
    const subscription =
      await getSubscription(
        req.user.id
      );

    res.json(subscription);
  }
);

router.get(
  "/plan",
  async (req:any,res) => {
    const plan =
      await getPlan(
        req.user.id
      );

    res.json({
      plan,
    });
  }
);

router.get(
  "/provider",
  async (req:any,res) => {
    const provider =
      await getAIProvider(
        req.user.id
      );

    res.json({
      provider,
    });
  }
);

router.get(
  "/limits",
  async (req:any,res) => {
    const plan =
      await getPlan(
        req.user.id
      );

    res.json(
      getPlanLimits(
        plan
      )
    );
  }
);

export default router;
