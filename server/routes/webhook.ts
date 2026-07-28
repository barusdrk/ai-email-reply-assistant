import { Router } from "express";
import { processWebhook } from "../services/webhookService";

const router = Router();

router.post("/gmail", async (req, res) => {
  try {
    await processWebhook("gmail", req.body);
    res.sendStatus(200);
  } catch {
    res.sendStatus(500);
  }
});

router.post("/outlook", async (req, res) => {
  try {
    await processWebhook("outlook", req.body);
    res.sendStatus(200);
  } catch {
    res.sendStatus(500);
  }
});

router.get("/outlook", (req, res) => {
  const token = req.query.validationToken;

  if (typeof token === "string")
    return res.status(200).send(token);

  res.sendStatus(400);
});

export default router;
