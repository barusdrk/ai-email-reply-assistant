import { Router, type Request, type Response } from "express";
import { auth } from "../middleware/auth.js";
import { DRAFT_STATUSES, type DraftStatus } from "../models/Draft.js";
import { drafts, draft, createDraft, updateDraft, deleteDraft, approveDraft, rejectDraft, sendDraft, submitDraft } from "../services/drafts.js";

type IdParams = { id: string };

const router = Router();

router.use(auth);

router.get("/", async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  if (status && !DRAFT_STATUSES.includes(status as DraftStatus)) {
    res.status(400).json({ message: "Invalid draft status." });
    return;
  }

  try {
    res.json(await drafts(req.user.id, status as DraftStatus | undefined));
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load drafts.",
    });
  }
});

router.get("/:id", async (req: Request<IdParams>, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const result = await draft(req.params.id);

    if (!result) {
      res.status(404).json({ message: "Draft not found." });
      return;
    }

    if (result.userId.toString() !== req.user.id) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load draft.",
    });
  }
});

router.post("/", async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    res.status(201).json(await createDraft({
      ...req.body,
      userId: req.user.id,
    }));
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to create draft.",
    });
  }
});

router.put("/:id", async (req: Request<IdParams>, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const existing = await draft(req.params.id);

    if (!existing) {
      res.status(404).json({ message: "Draft not found." });
      return;
    }

    if (existing.userId.toString() !== req.user.id) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const result = await updateDraft(req.params.id, req.body);

    if (!result) {
      res.status(404).json({ message: "Draft not found." });
      return;
    }

    res.json(result);
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to update draft.",
    });
  }
});

router.post("/:id/submit", async (req: Request<IdParams>, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const result = await submitDraft(req.params.id, req.user.id);

    if (!result) {
      res.status(404).json({ message: "Draft not found." });
      return;
    }

    res.json(result);
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to submit draft.",
    });
  }
});

router.post("/:id/approve", async (req: Request<IdParams>, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const result = await approveDraft(req.params.id, req.user.id);

    if (!result) {
      res.status(404).json({ message: "Draft not found." });
      return;
    }

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve draft.";

    if (message.startsWith("Policy check failed:")) {
      res.status(422).json({
        message,
        policyCheckFailed: true,
      });
      return;
    }

    res.status(400).json({ message });
  }
});

router.post("/:id/reject", async (req: Request<IdParams>, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const result = await rejectDraft(
      req.params.id,
      req.user.id,
      typeof req.body?.reason === "string" ? req.body.reason : undefined
    );

    if (!result) {
      res.status(404).json({ message: "Draft not found." });
      return;
    }

    res.json(result);
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Failed to reject draft.",
    });
  }
});

router.post("/:id/send", async (req: Request<IdParams>, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const result = await sendDraft(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send draft.";

    if (message.startsWith("Policy check failed:")) {
      res.status(422).json({
        message,
        policyCheckFailed: true,
      });
      return;
    }

    res.status(400).json({ message });
  }
});

router.delete("/:id", async (req: Request<IdParams>, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const existing = await draft(req.params.id);

    if (!existing) {
      res.status(404).json({ message: "Draft not found." });
      return;
    }

    if (existing.userId.toString() !== req.user.id) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const result = await deleteDraft(req.params.id);

    if (!result) {
      res.status(404).json({ message: "Draft not found." });
      return;
    }

    res.status(204).end();
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to delete draft.",
    });
  }
});

export default router;
