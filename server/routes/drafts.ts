import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getDrafts,
  createDraft,
  updateDraft,
  deleteDraft,
  submitDraft,
} from "../services/draftService.js";

const router = Router();

router.get("/", authenticate, (req, res) => res.json(getDrafts((req as any).user.id)));

router.post("/", authenticate, (req, res) => {
  res.status(201).json(
    createDraft((req as any).user.id, req.body.emailId, req.body.reply)
  );
});

router.put("/:id", authenticate, (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const draft = updateDraft(id, req.body.reply);
  if (!draft) return res.status(404).json({ message: "Draft not found." });
  res.json(draft);
});

router.delete("/:id", authenticate, (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!deleteDraft(id))
    return res.status(404).json({ message: "Draft not found." });

  res.sendStatus(204);
});

router.post("/:id/submit", authenticate, (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const draft = submitDraft(id);
  if (!draft) return res.status(404).json({ message: "Draft not found." });
  res.json(draft);
});

export default router;
