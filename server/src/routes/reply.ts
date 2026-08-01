import {
  Router,
  type Request,
  type Response,
} from "express";

import {
  authenticate,
} from "../middleware/auth.js";

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
    req: Request,
    res: Response
  ) => {
    try {
      if (!req.user) {
        res.status(401).json({
          message:
            "Unauthorized.",
        });
        return;
      }

      const {
        email,
        tone = "professional",
        length = "medium",
      } = req.body;

      if (!email?.trim()) {
        res.status(400).json({
          message:
            "Email is required.",
        });
        return;
      }

      if (
        !Object.keys(TONES)
          .includes(tone)
      ) {
        res.status(400).json({
          message:
            "Invalid tone.",
        });
        return;
      }

      const allowed =
        await canGenerateReply(
          req.user.id
        );

      if (!allowed) {
        res.status(403).json({
          message:
            "Subscription inactive.",
        });
        return;
      }

      const reply =
        await generateReply({
          email,
          tone:
            tone as Tone,
          length:
            length as ReplyLength,
        });

      res.json({
        reply,
      });

    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate reply.",
      });
    }
  }
);

export default router;
