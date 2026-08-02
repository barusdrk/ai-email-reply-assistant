import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { auth } from "../middleware/auth.js";
import {
  approvals,
  approval,
  requestApproval,
  approve,
  reject,
} from "../services/approval.js";

const router = Router();

router.use(auth);

router.get(
  "/",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const list =
        await approvals(
          req.user!.id
        );

      res.json(list);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id",
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const item =
        await approval(
          req.params.id
        );

      if (!item) {
        res.status(404).json({
          message: "Approval not found",
        });
        return;
      }

      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/",
  async (
    req: Request<
      {},
      {},
      {
        draftId: string;
        reviewerId: string;
      }
    >,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const item =
        await requestApproval(
          req.body.draftId,
          req.body.reviewerId
        );

      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/approve",
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const item =
        await approve(
          req.params.id
        );

      if (!item) {
        res.status(404).json({
          message: "Approval not found",
        });
        return;
      }

      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/reject",
  async (
    req: Request<
      { id: string },
      {},
      { comment?: string }
    >,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const item =
        await reject(
          req.params.id,
          req.body.comment
        );

      if (!item) {
        res.status(404).json({
          message: "Approval not found",
        });
        return;
      }

      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
