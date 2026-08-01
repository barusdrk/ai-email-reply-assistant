import {
  Router,
  type Request,
  type Response,
} from "express";

import {
  auth,
} from "../middleware/auth.js";

import {
  getSettings,
  updateSettings,
  resetSettings,
} from "../services/settings.js";

const router =
  Router();

router.use(auth);

router.get(
  "/",
  async (
    req: Request,
    res: Response
  ) => {
    if (!req.user) {
      res.status(401).json({
        message:
          "Unauthorized.",
      });
      return;
    }

    const settings =
      await getSettings(
        req.user.id
      );

    res.json(settings);
  }
);

router.put(
  "/",
  async (
    req: Request,
    res: Response
  ) => {
    if (!req.user) {
      res.status(401).json({
        message:
          "Unauthorized.",
      });
      return;
    }

    const settings =
      await updateSettings(
        req.user.id,
        req.body
      );

    res.json(settings);
  }
);

router.post(
  "/reset",
  async (
    req: Request,
    res: Response
  ) => {
    if (!req.user) {
      res.status(401).json({
        message:
          "Unauthorized.",
      });
      return;
    }

    const settings =
      await resetSettings(
        req.user.id
      );

    res.json(settings);
  }
);

export default router;
