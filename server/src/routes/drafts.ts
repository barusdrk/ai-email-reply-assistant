import {
  Router,
  type Request,
  type Response,
} from "express";

import {
  auth,
} from "../middleware/auth.js";

import {
  drafts,
  draft,
  createDraft,
  updateDraft,
  deleteDraft,
} from "../services/drafts.js";

type IdParams = {
  id: string;
};

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
          "Unauthorized",
      });
      return;
    }

    res.json(
      await drafts(
        req.user.id
      )
    );
  }
);

router.get(
  "/:id",
  async (
    req: Request<IdParams>,
    res: Response
  ) => {
    res.json(
      await draft(
        req.params.id
      )
    );
  }
);

router.post(
  "/",
  async (
    req: Request,
    res: Response
  ) => {
    res.status(201).json(
      await createDraft(
        req.body
      )
    );
  }
);

router.put(
  "/:id",
  async (
    req: Request<IdParams>,
    res: Response
  ) => {
    res.json(
      await updateDraft(
        req.params.id,
        req.body
      )
    );
  }
);

router.delete(
  "/:id",
  async (
    req: Request<IdParams>,
    res: Response
  ) => {
    await deleteDraft(
      req.params.id
    );

    res.status(204).end();
  }
);

export default router;
