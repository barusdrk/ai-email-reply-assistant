import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getPendingApprovals,
  approveDraft,
  rejectDraft,
} from "../services/approvalService.js";

const router = Router();

router.get("/", authenticate, (_, res) => {
  res.json(getPendingApprovals());
});

router.post("/:id/approve", authenticate, (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const draft = approveDraft(id);
  if (!draft) return res.status(404).json({ message: "Draft not found." });
  res.json(draft);
});

router.post("/:id/reject", authenticate, (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const draft = rejectDraft(id);
  if (!draft) return res.status(404).json({ message: "Draft not found." });
  res.json(draft);
});

export default router;
