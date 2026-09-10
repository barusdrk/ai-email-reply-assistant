import { Types } from "mongoose";
import { knowledgeBaseRepository } from "../repositories/KnowledgeBaseRepository.js";
import {
  buildKnowledgeBaseEmbeddingText,
  generateEmbedding,
} from "./embeddings.js";

export async function getKnowledgeBaseArticles(userId: string) {
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID.");
  const articles = await knowledgeBaseRepository.findAll(userId);
  if (!articles) throw new Error("Unable to load knowledge base.");
  return articles;
}

export async function getKnowledgeBaseArticle(userId: string, id: string) {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(id)) {
    throw new Error("Invalid user or article ID.");
  }
  return knowledgeBaseRepository.findById(userId, id);
}

export async function searchKnowledgeBase(userId: string, query: string) {
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID.");

  const embedding = await generateEmbedding(query);

  try {
    const articles = await knowledgeBaseRepository.semanticSearch(
      userId,
      embedding,
      5
    );

    if (!articles) {
      throw new Error("Unable to search knowledge base.");
    }

    return articles;
  } catch (error) {
    console.error("Semantic knowledge base search failed:", error);

    const fallback = await knowledgeBaseRepository.search(userId, query);

    if (!fallback) {
      throw new Error("Unable to search knowledge base.");
    }

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
  }
) {
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID.");
  if (!data.title.trim()) throw new Error("Article title is required.");
  if (!data.content.trim()) throw new Error("Article content is required.");

  const article = await knowledgeBaseRepository.create({
    userId,
    ...data,
  });

  const embeddingText = buildKnowledgeBaseEmbeddingText({
    title: article.title,
    content: article.content,
    category: article.category,
    tags: article.tags,
  });

  const embedding = await generateEmbedding(embeddingText);

  return knowledgeBaseRepository.update(
    userId,
    article._id.toString(),
    { embedding }
  );
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
  }
) {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(id)) {
    throw new Error("Invalid user or article ID.");
  }

  if (data.title !== undefined && !data.title.trim()) {
    throw new Error("Article title cannot be empty.");
  }

  if (data.content !== undefined && !data.content.trim()) {
    throw new Error("Article content cannot be empty.");
  }

  const article = await knowledgeBaseRepository.update(
    userId,
    id,
    data
  );

  if (!article) return null;

  const embeddingText = buildKnowledgeBaseEmbeddingText({
    title: article.title,
    content: article.content,
    category: article.category,
    tags: article.tags,
  });

  const embedding = await generateEmbedding(embeddingText);

  return knowledgeBaseRepository.update(
    userId,
    id,
    { embedding }
  );
}

export async function deleteKnowledgeBaseArticle(
  userId: string,
  id: string
) {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(id)) {
    throw new Error("Invalid user or article ID.");
  }

  return knowledgeBaseRepository.delete(userId, id);
}

export async function getRelevantKnowledgeBase(
  userId: string,
  query: string
) {
  return searchKnowledgeBase(userId, query);
}
