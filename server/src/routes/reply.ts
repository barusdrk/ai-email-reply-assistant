import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { canGenerateReply } from "../services/billing.js";
import { generateReplyForUser } from "../services/ai.js";
import { TONES } from "../templates/tones.js";
import type { Tone, ReplyLength } from "../ai/types.js";

const router = Router();

router.post("/", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const { email, tone = "professional", length = "medium", signature } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      res.status(400).json({ message: "Email is required." });
      return;
    }

    if (!Object.keys(TONES).includes(tone)) {
      res.status(400).json({ message: "Invalid tone." });
      return;
    }

    if (!["short", "medium", "long"].includes(length)) {
      res.status(400).json({ message: "Invalid reply length." });
      return;
    }

    const allowed = await canGenerateReply(req.user.id);

    if (!allowed) {
      res.status(403).json({ message: "Subscription inactive." });
      return;
    }

    const reply = await generateReplyForUser(req.user.id, {
      email,
      tone: tone as Tone,
      length: length as ReplyLength,
      signature: typeof signature === "string" ? signature : undefined,
    });

    if (!reply.trim()) {
      res.status(500).json({ message: "AI returned an empty reply." });
      return;
    }

    res.json({ reply });
  } catch (error) {
    console.error("POST /api/reply failed:", error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to generate reply.",
    });
  }
});

export default router;
