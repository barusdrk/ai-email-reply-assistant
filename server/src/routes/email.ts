import { Router, type Request, type Response } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/auth.js";
import { inbox, email, syncInbox, syncAllInboxes, sendEmail } from "../services/email.js";
import { loadSampleEmails } from "../services/sampleEmails.js";
import { listEmails as listOutlookEmails } from "../services/outlook.js";
import { classifyEmail } from "../services/emailClassification.js";
import { identifyCustomer } from "../services/customerIdentification.js";
import { checkReplyPolicy } from "../services/policyChecker.js";
import { searchKnowledgeBase } from "../services/knowledgeBase.js";
import EmailModel from "../models/Email.js";

const router = Router();

router.post("/:id/classify", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const id = req.params.id;

  if (typeof id !== "string" || Array.isArray(id)) {
    res.status(400).json({ success: false, message: "Invalid email ID." });
    return;
  }

  try {
    const classification = await classifyEmail(id, req.user.id);
    res.json({ success: true, classification });
  } catch (error) {
    console.error("Email classification failed:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to classify email.",
    });
  }
});

router.post("/:id/identify-customer", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const id = req.params.id;

  if (typeof id !== "string" || Array.isArray(id)) {
    res.status(400).json({ success: false, message: "Invalid email ID." });
    return;
  }

  try {
    const result = await identifyCustomer(id, req.user.id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Customer identification failed:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to identify customer.",
    });
  }
});

router.get("/", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const pageValue = Number(req.query.page);
  const limitValue = Number(req.query.limit);
  const page = Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : 1;
  const limit = Number.isFinite(limitValue) && limitValue > 0 ? Math.min(Math.floor(limitValue), 100) : 50;

  try {
    const result = await inbox(req.user.id, { page, limit });
    res.json({
      success: true,
      emails: result.emails,
      total: result.total,
      page,
      limit,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error("Failed to get inbox:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to get inbox.",
    });
  }
});

router.post("/sync", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  try {
    const result = await syncAllInboxes(req.user.id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Inbox sync failed:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to sync inboxes.",
    });
  }
});

router.post("/sample", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  try {
    const emails = await loadSampleEmails(req.user.id);
    res.json({ success: true, count: emails.length, emails });
  } catch (error) {
    console.error("Failed to load sample emails:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to load sample emails.",
    });
  }
});

router.post("/gmail/sync", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  try {
    const emails = await syncInbox("gmail", req.user.id);
    res.json({ success: true, count: emails.length, emails });
  } catch (error) {
    console.error("Gmail sync failed:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to sync Gmail.",
    });
  }
});

router.post("/outlook/sync", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  try {
    const emails = await syncInbox("outlook", req.user.id);
    res.json({ success: true, count: emails.length, emails });
  } catch (error) {
    console.error("Outlook sync failed:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to sync Outlook.",
    });
  }
});

router.get("/outlook/test", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  try {
    const emails = await listOutlookEmails(req.user.id);
    res.json({ success: true, count: emails.length, emails });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to retrieve Outlook emails.",
    });
  }
});

router.post("/send", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const { provider, to, subject, body, threadId, emailId } = req.body ?? {};

  if (provider !== "gmail" && provider !== "outlook" && provider !== "sample") {
    res.status(400).json({
      success: false,
      message: "Provider must be gmail, outlook, or sample.",
    });
    return;
  }

  if (
    typeof to !== "string" ||
    !to.trim() ||
    typeof subject !== "string" ||
    !subject.trim() ||
    typeof body !== "string" ||
    !body.trim()
  ) {
    res.status(400).json({
      success: false,
      message: "Recipient, subject, and body are required.",
    });
    return;
  }

  if (typeof emailId !== "string" || !Types.ObjectId.isValid(emailId)) {
    res.status(400).json({
      success: false,
      message: "A valid source email ID is required.",
    });
    return;
  }

  if (threadId !== undefined && typeof threadId !== "string") {
    res.status(400).json({
      success: false,
      message: "Thread ID must be a string.",
    });
    return;
  }

  try {
    const sourceEmail = await EmailModel.findOne({
      _id: new Types.ObjectId(emailId),
      userId: new Types.ObjectId(req.user.id),
    }).lean();

    if (!sourceEmail) {
      res.status(404).json({
        success: false,
        message: "Source email not found.",
      });
      return;
    }

    const customerEmailBody  = sourceEmail.body?.trim() ?? "";

    if (!customerEmailBody ) {
      res.status(422).json({
        success: false,
        message: "The original customer email has no body, so the reply cannot be policy checked.",
      });
      return;
    }

    const knowledgeBase = await searchKnowledgeBase(req.user.id, customerEmailBody );

    const policyCheck = await checkReplyPolicy({
      email: customerEmailBody,
      reply: body.trim(),
      knowledgeBase: knowledgeBase ?? [],
    });

    if (!policyCheck.compliant || policyCheck.violations.length > 0) {
      res.status(422).json({
        success: false,
        message: "Email cannot be sent because the reply failed policy checking.",
        policyCheck,
      });
      return;
    }

    const result = await sendEmail(req.user.id, {
      provider,
      to: to.trim(),
      subject: subject.trim(),
      body: body.trim(),
      threadId: threadId?.trim() || sourceEmail.threadId || undefined,
      inReplyTo:
        provider === "gmail"
          ? sourceEmail.messageIdHeader || undefined
          : undefined,
      references:
        provider === "gmail"
          ? sourceEmail.references ?? []
          : undefined,
      originalMessageId:
        provider === "outlook"
          ? sourceEmail.messageId
          : undefined,
    });

    res.json({
      success: true,
      ...result,
      policyCheck,
    });
  } catch (error) {
    console.error("Email send failed:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to send email.",
    });
  }
});

router.get("/:id", authenticate, async (req: Request, res: Response) => {
  const id = req.params.id;

  if (typeof id !== "string" || Array.isArray(id)) {
    res.status(400).json({ success: false, message: "Invalid email ID." });
    return;
  }

  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  try {
    const result = await email(id, req.user.id);

    if (!result) {
      res.status(404).json({ success: false, message: "Email not found." });
      return;
    }

    res.json({ success: true, email: result });
  } catch (error) {
    console.error("Failed to get email:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to get email.",
    });
  }
});

export default router;
