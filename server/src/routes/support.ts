import {Router} from "express";
import {auth} from "../middleware/auth.js";
import {analyzeSupportRequest} from "../services/supportEngine.js";

const router = Router();

router.post("/analyze", auth, async (req, res) => {
  try {
    const {customerMessage, conversationHistory, knowledgeBase, customerContext, tone, length} = req.body;

    if (typeof customerMessage !== "string" || !customerMessage.trim()) {
      return res.status(400).json({message: "Customer message is required."});
    }

    const result = await analyzeSupportRequest({
      customerMessage: customerMessage.trim(),
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : [],
      knowledgeBase: Array.isArray(knowledgeBase) ? knowledgeBase : [],
      customerContext: customerContext && typeof customerContext === "object" ? customerContext : undefined,
      tone,
      length,
    });

    return res.json(result);
  } catch (error) {
    console.error("Support analysis error:", error);
    return res.status(500).json({message: error instanceof Error ? error.message : "Failed to analyze support request."});
  }
});

export default router;
