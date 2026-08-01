import {
  Router,
  type Request,
  type Response,
} from "express";

import {
  auth,
} from "../middleware/auth.js";

import {
  connectOutlook,
  disconnectOutlook,
  outlookStatus,
  syncOutlook,
} from "../services/outlook.js";

const router =
  Router();

router.use(auth);

router.post(
  "/connect",
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

    res.json(
      await connectOutlook(
        req.user.id
      )
    );
  }
);

router.post(
  "/disconnect",
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

    res.json(
      await disconnectOutlook(
        req.user.id
      )
    );
  }
);

router.get(
  "/status",
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

    res.json(
      await outlookStatus(
        req.user.id
      )
    );
  }
);

router.post(
  "/sync",
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

    res.json(
      await syncOutlook(
        req.user.id
      )
    );
  }
);

export default router;
