import {
  Router,
  type Request,
  type Response,
} from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getDashboardStats,
} from "../services/dashboard.js";

const router = Router();

router.get(
  "/",
  authenticate,
  async (
    req: Request,
    res: Response
  ) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    try {
      const stats =
        await getDashboardStats(req.user.id);

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error(
        "Failed to get dashboard statistics:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to get dashboard statistics.",
      });
    }
  }
);

export default router;
