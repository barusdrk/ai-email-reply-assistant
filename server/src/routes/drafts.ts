import {
  Router,
  type Request,
  type Response,
} from "express";
import { auth } from "../middleware/auth.js";
import {
  drafts,
  draft,
  createDraft,
  updateDraft,
  deleteDraft,
  approveDraft,
  rejectDraft,
  sendDraft,
} from "../services/drafts.js";
import {
  submitDraft,
} from "../services/drafts.js";

type IdParams = {
  id: string;
};

type SendDraftBody = {
  provider: "gmail" | "outlook";
};

const router = Router();

router.use(auth);

router.get("/", async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  res.json(await drafts(req.user.id));
});

router.get("/:id", async (
  req: Request<IdParams>,
  res: Response
) => {
  const result = await draft(req.params.id);

  if (!result) {
    res.status(404).json({ message: "Draft not found." });
    return;
  }

  res.json(result);
});

router.post("/", async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  res.status(201).json(
    await createDraft({
      ...req.body,
      userId: req.user.id,
    })
  );
});

router.put("/:id", async (
  req: Request<IdParams>,
  res: Response
) => {
  const result = await updateDraft(
    req.params.id,
    req.body
  );

  if (!result) {
    res.status(404).json({ message: "Draft not found." });
    return;
  }

  res.json(result);
});

router.post("/:id/submit", async (
  req: Request<IdParams>,
  res: Response
) => {
  if (!req.user) {
    res.status(401).json({
      message: "Unauthorized",
    });
    return;
  }

  const result = await submitDraft(
    req.params.id,
    req.user.id
  );

  if (!result) {
    res.status(404).json({
      message: "Draft not found.",
    });
    return;
  }

  res.json(result);
});

router.post("/:id/submit", async (
  req: Request<IdParams>,
  res: Response
) => {
  const result = await updateDraft(
    req.params.id,
    {
      status: "pending",
    }
  );

  if (!result) {
    res.status(404).json({
      message: "Draft not found.",
    });
    return;
  }

  res.json(result);
});

router.post("/:id/submit", async (
  req: Request<IdParams>,
  res: Response
) => {
  const result = await updateDraft(
    req.params.id,
    { status: "pending" }
  );

  if (!result) {
    res.status(404).json({
      message: "Draft not found.",
    });
    return;
  }

  res.json(result);
});

router.post("/:id/approve", async (
  req: Request<IdParams>,
  res: Response
) => {
  const result = await approveDraft(req.params.id);

  if (!result) {
    res.status(404).json({ message: "Draft not found." });
    return;
  }

  res.json(result);
});

router.post("/:id/reject", async (
  req: Request<IdParams>,
  res: Response
) => {
  const result = await rejectDraft(req.params.id);

  if (!result) {
    res.status(404).json({ message: "Draft not found." });
    return;
  }

  res.json(result);
});

router.post("/:id/send", async (
  req: Request<IdParams, unknown, SendDraftBody>,
  res: Response
) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const { provider } = req.body;

  if (
    provider !== "gmail" &&
    provider !== "outlook"
  ) {
    res.status(400).json({
      message: "Provider must be gmail or outlook.",
    });
    return;
  }

  try {
    const result = await sendDraft(
      req.params.id,
      req.user.id,
      provider
    );

    if (!result) {
      res.status(404).json({
        message: "Draft not found.",
      });
      return;
    }

    res.json(result);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to send draft.",
    });
  }
});

router.delete("/:id", async (
  req: Request<IdParams>,
  res: Response
) => {
  const result = await deleteDraft(req.params.id);

  if (!result) {
    res.status(404).json({ message: "Draft not found." });
    return;
  }

  res.status(204).end();
});

export default router;
