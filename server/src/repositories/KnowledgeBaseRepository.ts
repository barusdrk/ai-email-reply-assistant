import { Types } from "mongoose";
import KnowledgeBaseArticleModel from "../models/KnowledgeBaseArticle.js";

export const knowledgeBaseRepository = {
  findAll(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return null;
    return KnowledgeBaseArticleModel.find({
      userId: new Types.ObjectId(userId),
    }).sort({ createdAt: -1 });
  },
  findActive(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return null;
    return KnowledgeBaseArticleModel.find({
      userId: new Types.ObjectId(userId),
      active: true,
    }).sort({ createdAt: -1 });
  },
  findById(userId: string, id: string) {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(id)) return null;
    return KnowledgeBaseArticleModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });
  },
  search(userId: string, query: string) {
    if (!Types.ObjectId.isValid(userId)) return null;
    const search = query.trim();
    if (!search) return this.findActive(userId);
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    return KnowledgeBaseArticleModel.find({
      userId: new Types.ObjectId(userId),
      active: true,
      $or: [
        { title: regex },
        { content: regex },
        { tags: regex },
        { category: regex },
      ],
    }).sort({ createdAt: -1 });
  },
  semanticSearch(userId: string, embedding: number[], limit = 5) {
    if (!Types.ObjectId.isValid(userId)) return null;
    return KnowledgeBaseArticleModel.aggregate([
      {
        $vectorSearch: {
          index: "knowledge_base_vector_index",
          path: "embedding",
          queryVector: embedding,
          numCandidates: Math.max(limit * 20, 50),
          limit,
          filter: {
            userId: new Types.ObjectId(userId),
            active: true,
          },
        },
      },
      {
        $addFields: {
          score: { $meta: "vectorSearchScore" },
        },
      },
      {
        $project: {
          userId: 1,
          title: 1,
          content: 1,
          category: 1,
          tags: 1,
          active: 1,
          score: 1,
        },
      },
    ]);
  },
  create(data: {
    userId: string;
    title: string;
    content: string;
    category?: string;
    tags?: string[];
    active?: boolean;
  }) {
    return KnowledgeBaseArticleModel.create({
      userId: new Types.ObjectId(data.userId),
      title: data.title.trim(),
      content: data.content.trim(),
      category: data.category ?? "general",
      tags: data.tags?.map((tag) => tag.trim().toLowerCase()).filter(Boolean) ?? [],
      active: data.active ?? true,
    });
  },
  update(userId: string, id: string, data: {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
    active?: boolean;
    embedding?: number[];
  }) {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(id)) return null;
    const update: Record<string, unknown> = {};
    if (data.title !== undefined) update.title = data.title.trim();
    if (data.content !== undefined) update.content = data.content.trim();
    if (data.category !== undefined) update.category = data.category;
    if (data.tags !== undefined) update.tags = data.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
    if (data.active !== undefined) update.active = data.active;
    if (data.embedding !== undefined) update.embedding = data.embedding;
    return KnowledgeBaseArticleModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
      { $set: update },
      { new: true }
    );
  },
  delete(userId: string, id: string) {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(id)) return null;
    return KnowledgeBaseArticleModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });
  },
};
