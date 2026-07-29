import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  generateReply,
} from "../services/openai.js";
import {
  TONES,
  type Tone,
  type ReplyLength,
} from "../templates/tones.js";

const router =
  Router();

router.post(
  "/",
  authenticate,
  async (
    req,
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
