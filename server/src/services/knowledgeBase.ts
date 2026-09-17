import { Types } from "mongoose";
import { knowledgeBaseRepository } from "../repositories/KnowledgeBaseRepository.js";
import {buildKnowledgeBaseEmbeddingText, generateEmbedding} from "./embeddings.js";

export async function getKnowledgeBaseArticles(userId: string) {
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID.");
  const articles = await knowledgeBaseRepository.findAll(userId);
  if (!articles) throw new Error("Unable to load knowledge base.");
  return articles;
}

export async function getKnowledgeBaseArticle(userId: string, id: string) {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(id)) throw new Error("Invalid user or article ID.");
  return knowledgeBaseRepository.findById(userId, id);
}

export async function searchKnowledgeBase(userId: string, query: string) {
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID.");
  const searchQuery = query.trim();
  if (!searchQuery) {
    const articles = await knowledgeBaseRepository.findActive(userId);
    if (!articles) throw new Error("Unable to search knowledge base.");
    return articles;
  }
  let embedding: number[];
  try {
    embedding = await generateEmbedding(searchQuery);
  } catch (error) {
    console.error("Knowledge base embedding generation failed:", error);
    const fallback = await knowledgeBaseRepository.search(userId, searchQuery);
    if (!fallback) throw new Error("Unable to search knowledge base.");
    return fallback;
  }
  try {
    const articles = await knowledgeBaseRepository.semanticSearch(userId, embedding, 5);
    if (!articles) throw new Error("Unable to search knowledge base.");
    if (articles.length > 0) return articles;
    const fallback = await knowledgeBaseRepository.search(userId, searchQuery);
    if (!fallback) throw new Error("Unable to search knowledge base.");
    return fallback;
  } catch (error) {
    console.error("Semantic knowledge base search failed:", error);
    const fallback = await knowledgeBaseRepository.search(userId, searchQuery);
    if (!fallback) throw new Error("Unable to search knowledge base.");
    return fallback;
  }
}

export async function createKnowledgeBaseArticle(
  userId: string,
  data: {
    title: string;
    content: string;
    category?: string;
    tags?: string[];
    active?: boolean;
  },
) {
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID.");
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const content = typeof data.content === "string" ? data.content.trim() : "";
  if (!title) throw new Error("Article title is required.");
  if (!content) throw new Error("Article content is required.");
  const category = typeof data.category === "string" && data.category.trim()
    ? data.category.trim().toLowerCase()
    : "general";
  const tags = Array.isArray(data.tags)
    ? data.tags.map((tag) => typeof tag === "string" ? tag.trim().toLowerCase() : "").filter(Boolean)
    : [];
  const active = data.active ?? true;
  const article = await knowledgeBaseRepository.create({
    userId,
    title,
    content,
    category,
    tags,
    active,
  });
  const embeddingText = buildKnowledgeBaseEmbeddingText({
    title: article.title,
    content: article.content,
    category: article.category,
    tags: article.tags,
  });
  const embedding = await generateEmbedding(embeddingText);
  return knowledgeBaseRepository.update(userId, article._id.toString(), {embedding});
}

export async function updateKnowledgeBaseArticle(
  userId: string,
  id: string,
  data: {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
    active?: boolean;
  },
) {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(id)) throw new Error("Invalid user or article ID.");
  const updateData: {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
    active?: boolean;
  } = {};
  if (data.title !== undefined) {
    const title = typeof data.title === "string" ? data.title.trim() : "";
    if (!title) throw new Error("Article title cannot be empty.");
    updateData.title = title;
  }
  if (data.content !== undefined) {
    const content = typeof data.content === "string" ? data.content.trim() : "";
    if (!content) throw new Error("Article content cannot be empty.");
    updateData.content = content;
  }
  if (data.category !== undefined) {
    const category = typeof data.category === "string" ? data.category.trim().toLowerCase() : "";
    if (!category) throw new Error("Article category cannot be empty.");
    updateData.category = category;
  }
  if (data.tags !== undefined) {
    updateData.tags = Array.isArray(data.tags)
      ? data.tags.map((tag) => typeof tag === "string" ? tag.trim().toLowerCase() : "").filter(Boolean)
      : [];
  }
  if (data.active !== undefined) updateData.active = data.active;
  const article = await knowledgeBaseRepository.update(userId, id, updateData);
  if (!article) return null;
  const embeddingText = buildKnowledgeBaseEmbeddingText({
    title: article.title,
    content: article.content,
    category: article.category,
    tags: article.tags,
  });
  const embedding = await generateEmbedding(embeddingText);
  return knowledgeBaseRepository.update(userId, id, {embedding});
}

export async function deleteKnowledgeBaseArticle(userId: string, id: string) {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(id)) throw new Error("Invalid user or article ID.");
  return knowledgeBaseRepository.delete(userId, id);
}

export async function getRelevantKnowledgeBase(userId: string, query: string) {
  return searchKnowledgeBase(userId, query);
}
