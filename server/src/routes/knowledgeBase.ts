import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getKnowledgeBaseArticles,
  getKnowledgeBaseArticle,
  searchKnowledgeBase,
  createKnowledgeBaseArticle,
  updateKnowledgeBaseArticle,
  deleteKnowledgeBaseArticle,
} from "../services/knowledgeBase.js";

const router = Router();

router.get("/search", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }
  const query = req.query.q;
  if (query !== undefined && typeof query !== "string") {
    res.status(400).json({ success: false, message: "Invalid search query." });
    return;
  }
  try {
    const articles = await searchKnowledgeBase(req.user.id, query ?? "");
    res.json({ success: true, articles });
  } catch (error) {
    console.error("Knowledge base search failed:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to search knowledge base.",
    });
  }
});

router.get("/", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }
  try {
    const articles = await getKnowledgeBaseArticles(req.user.id);
    res.json({ success: true, articles });
  } catch (error) {
    console.error("Knowledge base lookup failed:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to load knowledge base.",
    });
  }
});

router.get("/:id", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }
  const { id } = req.params;
  if (typeof id !== "string" || Array.isArray(id)) {
    res.status(400).json({ success: false, message: "Invalid article ID." });
    return;
  }
  try {
    const article = await getKnowledgeBaseArticle(req.user.id, id);
    if (!article) {
      res.status(404).json({ success: false, message: "Knowledge base article not found." });
      return;
    }
    res.json({ success: true, article });
  } catch (error) {
    console.error("Knowledge base article lookup failed:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to load knowledge base article.",
    });
  }
});

router.post("/", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }
  try {
    const article = await createKnowledgeBaseArticle(req.user.id, req.body);
    res.status(201).json({ success: true, article });
  } catch (error) {
    console.error("Knowledge base article creation failed:", error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to create knowledge base article.",
    });
  }
});

router.put("/:id", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }
  const { id } = req.params;
  if (typeof id !== "string" || Array.isArray(id)) {
    res.status(400).json({ success: false, message: "Invalid article ID." });
    return;
  }
  try {
    const article = await updateKnowledgeBaseArticle(req.user.id, id, req.body);
    if (!article) {
      res.status(404).json({ success: false, message: "Knowledge base article not found." });
      return;
    }
    res.json({ success: true, article });
  } catch (error) {
    console.error("Knowledge base article update failed:", error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to update knowledge base article.",
    });
  }
});

router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }
  const { id } = req.params;
  if (typeof id !== "string" || Array.isArray(id)) {
    res.status(400).json({ success: false, message: "Invalid article ID." });
    return;
  }
  try {
    const article = await deleteKnowledgeBaseArticle(req.user.id, id);
    if (!article) {
      res.status(404).json({ success: false, message: "Knowledge base article not found." });
      return;
    }
    res.json({ success: true, message: "Knowledge base article deleted." });
  } catch (error) {
    console.error("Knowledge base article deletion failed:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete knowledge base article.",
    });
  }
});

export default router;
