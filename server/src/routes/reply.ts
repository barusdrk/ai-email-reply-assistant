import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  generateReply,
} from "../services/ai.js";
import {
  TONES,
  type Tone,
  type ReplyLength,
} from "../templates/tones.js";
import {
  canGenerateReply,
} from "../services/billing.js";

const router =
  Router();

router.post(
  "/",
  authenticate,
  async (
    req:any,
    res
  ) => {
    try {
      const {
        email,
        tone = "professional",
        length = "medium",
      } = req.body;

      if (!email?.trim()) {
        return res
          .status(400)
          .json({
            message:
              "Email is required.",
          });
      }

      if (
        !Object.keys(TONES)
          .includes(tone)
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid tone.",
          });
      }

      const allowed =
        await canGenerateReply(
          req.user.id
        );

      if (!allowed) {
        return res
          .status(403)
          .json({
            message:
              "Subscription inactive.",
          });
      }

      const reply =
        await generateReply({
          email,
          tone:
            tone as Tone,
          length:
            length as ReplyLength,
        });

      return res.json({
        reply,
      });

    } catch (error) {
      return res
        .status(500)
        .json({
          message:
            error instanceof Error
              ? error.message
              : "Failed to generate reply.",
        });
    }
  }
);

export default router;
