import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getProfile,
  updateProfile,
  updateSignature,
  updateTheme,
} from "../services/userService.js";

const router = Router();

router.get("/me", authenticate, async (req, res) => {
  res.json(await getProfile((req as any).user.id));
});

router.put("/me", authenticate, async (req, res) => {
  res.json(await updateProfile((req as any).user.id, req.body));
});

router.put("/signature", authenticate, async (req, res) => {
  const { signature } = req.body;
  res.json(await updateSignature((req as any).user.id, signature));
});

router.put("/theme", authenticate, async (req, res) => {
  const { theme } = req.body;
  res.json(await updateTheme((req as any).user.id, theme));
});

export default router;
