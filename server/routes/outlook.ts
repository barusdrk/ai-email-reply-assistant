import { Router } from "express";
import { auth } from "../middleware/auth.js";
import {
  connectOutlook,
  disconnectOutlook,
  outlookStatus,
  syncOutlook,
} from "../services/outlook.js";

const router = Router();

router.use(auth);

router.post("/connect", async (req: any, res) => {
  res.json(
    await connectOutlook(req.user.id)
  );
});

router.post("/disconnect", async (req: any, res) => {
  res.json(
    await disconnectOutlook(req.user.id)
  );
});

router.get("/status", async (req: any, res) => {
  res.json(
    await outlookStatus(req.user.id)
  );
});

router.post("/sync", async (req: any, res) => {
  res.json(
    await syncOutlook(req.user.id)
  );
});

export default router;
