import { Router, type Request, type Response } from "express";
import { auth } from "../middleware/auth.js";
import { getGoogleAuthUrl, exchangeCode, connectionStatus, disconnectAccount } from "../services/gmail.js";
import { getMicrosoftAuthUrl, exchangeMicrosoftCode, outlookStatus, disconnectOutlook } from "../services/outlook.js";

const router = Router();

router.get("/gmail/callback", async (req: Request, res: Response) => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";

    if (!code || !state) {
      res.status(400).send("Missing Google authorization code or state.");
      return;
    }

    await exchangeCode(code, state);

    const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";
    res.redirect(`${clientUrl}/settings?gmail=connected`);
  } catch (error) {
    const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";
    const message = error instanceof Error ? error.message : "Failed to connect Gmail.";
    res.redirect(`${clientUrl}/settings?gmail=error&message=${encodeURIComponent(message)}`);
  }
});

router.get("/outlook/callback", async (req: Request, res: Response) => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";

    if (!code || !state) {
      res.status(400).send("Missing Microsoft authorization code or state.");
      return;
    }

    await exchangeMicrosoftCode(code, state);

    const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";
    res.redirect(`${clientUrl}/settings?outlook=connected`);
  } catch (error) {
    const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";
    const message = error instanceof Error ? error.message : "Failed to connect Outlook.";
    res.redirect(`${clientUrl}/settings?outlook=error&message=${encodeURIComponent(message)}`);
  }
});

router.use(auth);

router.get("/", async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  try {
    const [gmail, outlook] = await Promise.all([
      connectionStatus(req.user.id),
      outlookStatus(req.user.id),
    ]);

    res.json({
      gmail,
      outlook: outlook.connected,
    });
  } catch (error) {
    console.error("GET /api/accounts failed:", error);

    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to get account status.",
    });
  }
});

router.get("/gmail/connect", async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  try {
    const url = getGoogleAuthUrl(req.user.id);
    res.json({ url });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to start Gmail connection.",
    });
  }
});

router.delete("/gmail", async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  try {
    await disconnectAccount(req.user.id);
    res.json({ success: true, gmail: false });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to disconnect Gmail.",
    });
  }
});

router.get("/outlook/connect", async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  try {
    const url = await getMicrosoftAuthUrl(req.user.id);
    res.json({ url });
  } catch (error) {
    console.error("Outlook OAuth start failed:", error);
    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to start Outlook connection.",
    });
  }
});

router.get("/outlook/status", async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  try {
    res.json(await outlookStatus(req.user.id));
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to get Outlook status.",
    });
  }
});

router.delete("/outlook", async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  try {
    res.json(await disconnectOutlook(req.user.id));
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to disconnect Outlook.",
    });
  }
});

export default router;
