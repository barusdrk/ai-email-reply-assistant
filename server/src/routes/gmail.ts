import { Router } from "express";
import {
  getGoogleAuthUrl,
  exchangeCode,
  disconnectAccount,
  connectionStatus,
} from "../services/gmailService.js";

const router = Router();

router.get("/login", (_, res) => {
  res.json(getGoogleAuthUrl());
});

router.get("/callback", async (req, res) => {
  const code = req.query.code as string;

  if (!code)
    return res.status(400).json({
      message: "Authorization code missing.",
    });

  res.json(await exchangeCode(code));
});

router.post("/disconnect", async (_, res) => {
  await disconnectAccount();
  res.json({ success: true });
});

router.get("/status", async (_, res) => {
  res.json(await connectionStatus());
});

export default router;
