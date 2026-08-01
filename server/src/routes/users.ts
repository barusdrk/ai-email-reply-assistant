import {
  Router,
  type Request,
  type Response,
} from "express";

import {
  auth,
} from "../middleware/auth.js";

import {
  me,
  updateProfile,
  deleteAccount,
} from "../services/users.js";

const router =
  Router();

router.use(auth);

router.get(
  "/me",
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
      await me(
        req.user.id
      )
    );
  }
);

router.put(
  "/me",
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
      await updateProfile(
        req.user.id,
        req.body
      )
    );
  }
);

router.delete(
  "/me",
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

    await deleteAccount(
      req.user.id
    );

    res.status(204).end();
  }
);

export default router;
