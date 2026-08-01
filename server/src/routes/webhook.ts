import {
  Router,
  type Request,
  type Response,
} from "express";

import {
  processWebhook,
} from "../services/webhookService.js";

const router =
  Router();

router.post(
  "/gmail",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      await processWebhook(
        "gmail",
        req.body
      );

      res.sendStatus(200);
    } catch {
      res.sendStatus(500);
    }
  }
);

router.post(
  "/outlook",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      await processWebhook(
        "outlook",
        req.body
      );

      res.sendStatus(200);
    } catch {
      res.sendStatus(500);
    }
  }
);

router.get(
  "/outlook",
  (
    req: Request,
    res: Response
  ) => {
    const token =
      req.query.validationToken;

    if (typeof token === "string") {
      res
        .status(200)
        .send(token);

      return;
    }

    res.sendStatus(400);
  }
);

export default router;
