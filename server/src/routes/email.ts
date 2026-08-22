import {
  Router,
  type Request,
  type Response,
} from "express";
import { authenticate } from "../middleware/auth.js";
import {
  inbox,
  email,
  syncInbox,
  syncAllInboxes,
} from "../services/email.js";
import {
  loadSampleEmails,
} from "../services/sampleEmails.js";
import {
  listEmails as listOutlookEmails,
} from "../services/outlook.js";

const router = Router();

router.get("/", authenticate, async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  const pageValue = Number(req.query.page);
  const limitValue = Number(req.query.limit);
  const page =
    Number.isFinite(pageValue) && pageValue > 0
      ? Math.floor(pageValue)
      : 1;
  const limit =
    Number.isFinite(limitValue) &&
    limitValue > 0
      ? Math.min(Math.floor(limitValue), 100)
      : 50;

  try {
    const result = await inbox(
      req.user.id,
      {
        page,
        limit,
      }
    );

    res.json({
      success: true,
      emails: result.emails,
      total: result.total,
      page,
      limit,
      hasMore:
        page * limit < result.total,
    });
  } catch (error) {
    console.error(
      "Failed to get inbox:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to get inbox.",
    });
  }
});

router.post("/sync", authenticate, async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  try {
    const result =
      await syncAllInboxes(req.user.id);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "Inbox sync failed:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to sync inboxes.",
    });
  }
});

router.post("/sample", authenticate, async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  try {
    const emails =
      await loadSampleEmails(req.user.id);

    res.json({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error(
      "Failed to load sample emails:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to load sample emails.",
    });
  }
});

router.post("/gmail/sync", authenticate, async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  try {
    const emails =
      await syncInbox(
        "gmail",
        req.user.id
      );

    res.json({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error(
      "Gmail sync failed:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to sync Gmail.",
    });
  }
});

router.post("/outlook/sync", authenticate, async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  try {
    const emails =
      await syncInbox(
        "outlook",
        req.user.id
      );

    res.json({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error(
      "Outlook sync failed:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to sync Outlook.",
    });
  }
});

router.get("/outlook/test", authenticate, async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  try {
    const emails =
      await listOutlookEmails(req.user.id);

    res.json({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to retrieve Outlook emails.",
    });
  }
});

router.get("/:id", authenticate, async (
  req: Request,
  res: Response
) => {
  const id = req.params.id;

  if (
    typeof id !== "string" ||
    Array.isArray(id)
  ) {
    res.status(400).json({
      success: false,
      message: "Invalid email ID.",
    });
    return;
  }

  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  try {
    const result = await email(
      id,
      req.user.id
    );

    if (!result) {
      res.status(404).json({
        success: false,
        message: "Email not found.",
      });
      return;
    }

    res.json({
      success: true,
      email: result,
    });
  } catch (error) {
    console.error(
      "Failed to get email:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to get email.",
    });
  }
});

export default router;
