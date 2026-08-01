import {
  Router,
  type Request,
  type Response,
} from "express";

import {
  getGoogleAuthUrl,
  exchangeCode,
  disconnectAccount,
  connectionStatus,
} from "../services/gmailService.js";

const router =
  Router();

router.get(
  "/login",
  (
    _req: Request,
    res: Response
  ) => {
    res.json(
      getGoogleAuthUrl()
    );
  }
);

router.get(
  "/callback",
  async (
    req: Request,
    res: Response
  ) => {
    const code =
      typeof req.query.code === "string"
        ? req.query.code
        : undefined;

    if (!code) {
      res.status(400).json({
        message:
          "Authorization code missing.",
      });
      return;
    }

    res.json(
      await exchangeCode(code)
    );
  }
);

router.post(
  "/disconnect",
  async (
    _req: Request,
    res: Response
  ) => {
    await disconnectAccount();

    res.json({
      success:true,
    });
  }
);

router.get(
  "/status",
  async (
    _req: Request,
    res: Response
  ) => {
    res.json(
      await connectionStatus()
    );
  }
);

export default router;
