import { Router } from "express";
import { auth } from "../middleware/auth.js";
import {
  getSettings,
  updateSettings,
  resetSettings,
} from "../services/settings.js";

const router =
  Router();

router.use(auth);

router.get(
  "/",
  async (req:any,res) => {
    const settings =
      await getSettings(
        req.user.id
      );

    res.json(settings);
  }
);

router.put(
  "/",
  async (req:any,res) => {
    const settings =
      await updateSettings(
        req.user.id,
        req.body
      );

    res.json(settings);
  }
);

router.post(
  "/reset",
  async (req:any,res) => {
    const settings =
      await resetSettings(
        req.user.id
      );

    res.json(settings);
  }
);

export default router;
