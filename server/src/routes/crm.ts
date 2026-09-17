import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { customers, customer, recordSupportHistory } from "../services/crm.js";

const router = Router();

router.use(authenticate);

function getUserId(req: Request): string | null {
  const user = (req as Request & { user?: { id?: string } }).user;
  return typeof user?.id === "string" && user.id.trim() ? user.id : null;
}

function getRouteId(req: Request): string | null {
  const id = req.params.id;
  return typeof id === "string" && id.trim() ? id : null;
}

router.get("/customers", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized." });
    const result = await customers(userId);
    return res.json(result);
  } catch (error) {
    console.error("Failed to load CRM customers:", error);
    return res.status(500).json({ message: "Failed to load customers." });
  }
});

router.get("/customers/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const customerId = getRouteId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized." });
    if (!customerId) return res.status(400).json({ message: "Invalid customer ID." });
    const result = await customer(customerId, userId);
    if (!result) return res.status(404).json({ message: "Customer not found." });
    return res.json(result);
  } catch (error) {
    console.error("Failed to load CRM customer:", error);
    return res.status(500).json({ message: "Failed to load customer." });
  }
});

router.post("/customers/:id/support-history", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const customerId = getRouteId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized." });
    if (!customerId) return res.status(400).json({ message: "Invalid customer ID." });
    const { emailId, draftId, action, category, confidence, summary } = req.body ?? {};
    if (!["replied", "approved", "rejected", "escalated", "blocked"].includes(action)) {
      return res.status(400).json({ message: "Invalid support history action." });
    }
    const result = await recordSupportHistory(userId, customerId, {
      emailId,
      draftId,
      action,
      category,
      confidence,
      summary,
    });
    return res.status(201).json(result);
  } catch (error) {
    console.error("Failed to record CRM support history:", error);
    return res.status(500).json({ message: "Failed to record support history." });
  }
});

export default router;
