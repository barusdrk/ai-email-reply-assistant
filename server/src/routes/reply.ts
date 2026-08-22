import {
  Router,
  type Request,
  type Response,
} from "express";

import {
  authenticate,
} from "../middleware/auth.js";

import {
  ai,
} from "../ai/index.js";

import {
  canGenerateReply,
} from "../services/billing.js";

import {
  TONES,
} from "../templates/tones.js";

import type {
  Tone,
  ReplyLength,
} from "../ai/types.js";

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
        signature,
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
        await ai.generateReply({
          email,
          tone:
            tone as Tone,
          length:
            length as ReplyLength,
          signature,
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
