import {
  Router,
  type Request,
  type Response,
} from "express";
import { auth } from "../middleware/auth.js";
import {
  getSettings,
  updateSettings,
  resetSettings,
} from "../services/settings.js";

const router = Router();

router.use(auth);

const DEFAULT_REPLY_TONES = [
  "friendly",
  "formal",
  "professional",
  "concise",
  "empathetic",
  "enthusiastic",
] as const;

const DEFAULT_REPLY_LENGTHS = [
  "short",
  "medium",
  "long",
] as const;

router.get(
  "/",
  async (
    req: Request,
    res: Response
  ) => {
    if (!req.user) {
      res.status(401).json({
        message: "Unauthorized.",
      });
      return;
    }

    try {
      const settings = await getSettings(
        req.user.id
      );

      res.json({
        ...settings,
        defaultReplyTone:
          settings.defaultReplyTone ?? "formal",
        defaultLength:
          settings.defaultLength ?? "medium",
      });
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Failed to load settings.",
      });
    }
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
        message: "Unauthorized.",
      });
      return;
    }

    try {
      const {
        defaultReplyTone,
        defaultLength,
        ...updates
      } = req.body;

      if (
        defaultReplyTone !== undefined &&
        !DEFAULT_REPLY_TONES.includes(
          defaultReplyTone
        )
      ) {
        res.status(400).json({
          message: "Invalid default reply tone.",
        });
        return;
      }

      if (
        defaultLength !== undefined &&
        !DEFAULT_REPLY_LENGTHS.includes(
          defaultLength
        )
      ) {
        res.status(400).json({
          message: "Invalid default reply length.",
        });
        return;
      }

      const settings = await updateSettings(
        req.user.id,
        {
          ...updates,
          ...(defaultReplyTone !== undefined
            ? { defaultReplyTone }
            : {}),
          ...(defaultLength !== undefined
            ? { defaultLength }
            : {}),
        }
      );

      res.json({
        ...settings,
        defaultReplyTone:
          settings.defaultReplyTone ?? "formal",
        defaultLength:
          settings.defaultLength ?? "medium",
      });
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Failed to update settings.",
      });
    }
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
        message: "Unauthorized.",
      });
      return;
    }

    try {
      const settings = await resetSettings(
        req.user.id
      );

      res.json({
        ...settings,
        defaultReplyTone:
          settings.defaultReplyTone ?? "formal",
        defaultLength:
          settings.defaultLength ?? "medium",
      });
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Failed to reset settings.",
      });
    }
  }
);

export default router;
