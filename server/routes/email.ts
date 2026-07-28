import { Router } from "express";
import { authenticate } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, async (_, res) => {
  res.json([
    {
      id: "1",
      from: "customer@example.com",
      subject: "Refund Request",
      preview: "Hello, I would like...",
      body: "Hello, I would like a refund for my recent purchase.",
      receivedAt: new Date().toISOString(),
      unread: true,
    },
  ]);
});

router.get("/:id", authenticate, async (req, res) => {
  res.json({
    id: req.params.id,
    from: "customer@example.com",
    subject: "Refund Request",
    body: "Hello, I would like a refund for my recent purchase because the product arrived damaged.",
    receivedAt: new Date().toISOString(),
    unread: false,
  });
});

router.get("/gmail/login", (_, res) => {
  res.json({
    message: "Gmail OAuth will be implemented in Phase 3.",
  });
});

router.get("/outlook/login", (_, res) => {
  res.json({
    message: "Outlook OAuth will be implemented in Phase 3.",
  });
});

export default router;
