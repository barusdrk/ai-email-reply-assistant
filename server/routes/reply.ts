import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { buildEmailPrompt } from "../prompts/emailPrompt";
import { generateReply } from "../services/openai";
import { TONES, type Tone, type ReplyLength } from "../templates/tones";

const router = Router();

router.post("/", authenticate, async (req, res) => {
  try {
    const { email, tone = "professional", length = "medium", signature = "Customer Support" } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ message: "Email is required." });
    }

    if (!Object.keys(TONES).includes(tone as Tone)) {
      return res.status(400).json({ message: "Invalid tone." });
    }

    const prompt = buildEmailPrompt({
      email,
      tone: tone as Tone,
      length: length as ReplyLength,
      signature,
    });

    const reply = await generateReply(prompt);

    res.json({ reply });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to generate reply.",
    });
  }
});

export default router;
