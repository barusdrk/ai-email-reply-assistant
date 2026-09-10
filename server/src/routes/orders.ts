import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  findCustomerOrders,
  findOrderByNumber,
  lookupCustomerOrder,
} from "../services/orderLookup.js";

const router = Router();

router.get("/customer/:customerId/lookup", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const { customerId } = req.params;
  const orderNumber = req.query.orderNumber;

  if (typeof customerId !== "string" || Array.isArray(customerId)) {
    res.status(400).json({ success: false, message: "Invalid customer ID." });
    return;
  }

  if (orderNumber !== undefined && typeof orderNumber !== "string") {
    res.status(400).json({ success: false, message: "Invalid order number." });
    return;
  }

  try {
    const result = await lookupCustomerOrder(req.user.id, customerId, orderNumber);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Customer order lookup failed:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to lookup customer order.",
    });
  }
});

router.get("/customer/:customerId", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const { customerId } = req.params;

  if (typeof customerId !== "string" || Array.isArray(customerId)) {
    res.status(400).json({ success: false, message: "Invalid customer ID." });
    return;
  }

  try {
    const orders = await findCustomerOrders(req.user.id, customerId);
    res.json({ success: true, orders });
  } catch (error) {
    console.error("Customer order lookup failed:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to find customer orders.",
    });
  }
});

router.get("/:orderNumber", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const { orderNumber } = req.params;

  if (typeof orderNumber !== "string" || Array.isArray(orderNumber)) {
    res.status(400).json({ success: false, message: "Invalid order number." });
    return;
  }

  try {
    const order = await findOrderByNumber(req.user.id, orderNumber);

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found." });
      return;
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error("Order lookup failed:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to find order.",
    });
  }
});

export default router;
