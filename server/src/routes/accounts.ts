import { Router, type Request, type Response } from "express";
import { auth } from "../middleware/auth.js";
import {
  getGoogleAuthUrl,
  exchangeCode,
  connectionStatus,
  disconnectAccount,
} from "../services/gmail.js";
import {
  getMicrosoftAuthUrl,
  exchangeMicrosoftCode,
  outlookStatus,
  disconnectOutlook,
} from "../services/outlook.js";
import UserModel from "../models/User.js";

const router = Router();
const clientUrl = (process.env.CLIENT_URL ?? "http://localhost:5173")
  .split(",")[0]
  .trim();

router.get("/gmail/callback", async (req: Request, res: Response) => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";

    console.log("Gmail OAuth callback received.");
    console.log("Gmail OAuth state:", state);
    console.log("Gmail OAuth code received:", Boolean(code));

    if (!code || !state) {
      res.status(400).send("Missing Google authorization code or state.");
      return;
    }

    const account = await exchangeCode(code, state);

    await UserModel.findOneAndUpdate(
      {
        _id: account.userId,
        activeEmailProvider: null,
      },
      {
        activeEmailProvider: "gmail",
      }
    );

    console.log("Gmail account connected:", account.email);

    res.redirect(`${clientUrl}/settings?gmail=connected`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect Gmail.";

    console.error("Gmail OAuth callback failed:", error);

    res.redirect(
      `${clientUrl}/settings?gmail=error&message=${encodeURIComponent(message)}`
    );
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

    const account = await exchangeMicrosoftCode(code, state);

    await UserModel.findOneAndUpdate(
      {
        _id: account.userId,
        activeEmailProvider: null,
      },
      {
        activeEmailProvider: "outlook",
      }
    );

    res.redirect(`${clientUrl}/settings?outlook=connected`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect Outlook.";

    console.error("Outlook OAuth callback failed:", error);

    res.redirect(
      `${clientUrl}/settings?outlook=error&message=${encodeURIComponent(message)}`
    );
  }
});

router.use(auth);

router.get("/", async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  try {
    const [gmail, outlook, user] = await Promise.all([
      connectionStatus(req.user.id),
      outlookStatus(req.user.id),
      UserModel.findById(req.user.id)
        .select("activeEmailProvider")
        .lean(),
    ]);

    const gmailConnected = Boolean(gmail);
    const outlookConnected = Boolean(outlook.connected);

    let activeProvider =
      user?.activeEmailProvider === "gmail" ||
      user?.activeEmailProvider === "outlook"
        ? user.activeEmailProvider
        : null;

    if (
      (activeProvider === "gmail" && !gmailConnected) ||
      (activeProvider === "outlook" && !outlookConnected)
    ) {
      activeProvider =
        activeProvider === "gmail" && outlookConnected
          ? "outlook"
          : activeProvider === "outlook" && gmailConnected
            ? "gmail"
            : null;

      await UserModel.findByIdAndUpdate(req.user.id, {
        activeEmailProvider: activeProvider,
      });
    }

    res.json({
      gmail,
      outlook: outlookConnected,
      activeProvider,
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

router.put("/provider", async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const provider = req.body?.provider;

  if (provider !== "gmail" && provider !== "outlook") {
    res.status(400).json({
      message: "Provider must be gmail or outlook.",
    });
    return;
  }

  try {
    const connected =
      provider === "gmail"
        ? Boolean(await connectionStatus(req.user.id))
        : (await outlookStatus(req.user.id)).connected;

    if (!connected) {
      res.status(400).json({
        message: `Connect ${
          provider === "gmail" ? "Gmail" : "Outlook"
        } before selecting it as the active provider.`,
      });
      return;
    }

    await UserModel.findByIdAndUpdate(req.user.id, {
      activeEmailProvider: provider,
    });

    res.json({
      success: true,
      activeProvider: provider,
    });
  } catch (error) {
    console.error("PUT /api/accounts/provider failed:", error);

    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to select email provider.",
    });
  }
});

router.get("/gmail/connect", async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  try {
    res.json({
      url: getGoogleAuthUrl(req.user.id),
    });
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to start Gmail connection.",
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

    const outlook = await outlookStatus(req.user.id);

    const user = await UserModel.findById(req.user.id)
      .select("activeEmailProvider")
      .lean();

    let activeProvider = user?.activeEmailProvider ?? null;

    if (activeProvider === "gmail") {
      activeProvider = outlook.connected ? "outlook" : null;

      await UserModel.findByIdAndUpdate(req.user.id, {
        activeEmailProvider: activeProvider,
      });
    }

    res.json({
      success: true,
      gmail: false,
      activeProvider,
    });
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to disconnect Gmail.",
    });
  }
});

router.get("/outlook/connect", async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  try {
    res.json({
      url: getMicrosoftAuthUrl(req.user.id),
    });
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
      message:
        error instanceof Error
          ? error.message
          : "Failed to get Outlook status.",
    });
  }
});

router.delete("/outlook", async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  try {
    const result = await disconnectOutlook(req.user.id);
    const gmail = await connectionStatus(req.user.id);

    const user = await UserModel.findById(req.user.id)
      .select("activeEmailProvider")
      .lean();

    let activeProvider = user?.activeEmailProvider ?? null;

    if (activeProvider === "outlook") {
      activeProvider = gmail ? "gmail" : null;

      await UserModel.findByIdAndUpdate(req.user.id, {
        activeEmailProvider: activeProvider,
      });
    }

    res.json({
      ...result,
      activeProvider,
    });
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to disconnect Outlook.",
    });
  }
});

export default router;
