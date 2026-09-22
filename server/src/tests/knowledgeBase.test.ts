import {describe, expect, it, vi, beforeEach} from "vitest";
import {Types} from "mongoose";

vi.mock("../repositories/KnowledgeBaseRepository.js", () => ({
  knowledgeBaseRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findActive: vi.fn(),
    search: vi.fn(),
    semanticSearch: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../services/embeddings.js", () => ({
  buildKnowledgeBaseEmbeddingText: vi.fn(),
  generateEmbedding: vi.fn(),
}));

import {knowledgeBaseRepository} from "../repositories/KnowledgeBaseRepository.js";
import {buildKnowledgeBaseEmbeddingText, generateEmbedding} from "../services/embeddings.js";
import {
  getKnowledgeBaseArticles,
  getKnowledgeBaseArticle,
  searchKnowledgeBase,
  createKnowledgeBaseArticle,
  updateKnowledgeBaseArticle,
  deleteKnowledgeBaseArticle,
  getRelevantKnowledgeBase,
} from "../services/knowledgeBase.js";

const userId = new Types.ObjectId().toString();
const articleId = new Types.ObjectId().toString();

function createArticle(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(articleId),
    userId: new Types.ObjectId(userId),
    title: "Refund Policy",
    content: "Customers can request a refund within 30 days.",
    category: "refund_policy",
    tags: ["refund", "billing"],
    active: true,
    embedding: [0.1, 0.2, 0.3],
    ...overrides,
  };
}

describe("knowledgeBase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
    vi.mocked(buildKnowledgeBaseEmbeddingText).mockReturnValue("Refund Policy\nCustomers can request a refund within 30 days.");
  });

  it("loads all company knowledge-base articles", async () => {
    const articles = [createArticle()];
    vi.mocked(knowledgeBaseRepository.findAll).mockResolvedValue(articles as never);

    const result = await getKnowledgeBaseArticles(userId);

    expect(result).toEqual(articles);
    expect(knowledgeBaseRepository.findAll).toHaveBeenCalledWith(userId);
  });

  it("rejects an invalid user ID when loading articles", async () => {
    await expect(getKnowledgeBaseArticles("invalid-id")).rejects.toThrow("Invalid user ID.");
    expect(knowledgeBaseRepository.findAll).not.toHaveBeenCalled();
  });

  it("loads a single company knowledge-base article", async () => {
    const article = createArticle();
    vi.mocked(knowledgeBaseRepository.findById).mockResolvedValue(article as never);

    const result = await getKnowledgeBaseArticle(userId, articleId);

    expect(result).toEqual(article);
    expect(knowledgeBaseRepository.findById).toHaveBeenCalledWith(userId, articleId);
  });

  it("rejects invalid user or article IDs when loading an article", async () => {
    await expect(getKnowledgeBaseArticle("invalid-id", articleId)).rejects.toThrow("Invalid user or article ID.");
    await expect(getKnowledgeBaseArticle(userId, "invalid-id")).rejects.toThrow("Invalid user or article ID.");
    expect(knowledgeBaseRepository.findById).not.toHaveBeenCalled();
  });

  it("uses semantic search for company knowledge", async () => {
    const articles = [createArticle()];
    vi.mocked(knowledgeBaseRepository.semanticSearch).mockResolvedValue(articles as never);

    const result = await searchKnowledgeBase(userId, "How can I request a refund?");

    expect(result).toEqual(articles);
    expect(generateEmbedding).toHaveBeenCalledWith("How can I request a refund?");
    expect(knowledgeBaseRepository.semanticSearch).toHaveBeenCalledWith(userId, [0.1, 0.2, 0.3], 5);
    expect(knowledgeBaseRepository.search).not.toHaveBeenCalled();
  });

  it("falls back to keyword search when semantic search fails", async () => {
    const articles = [createArticle()];
    vi.mocked(knowledgeBaseRepository.semanticSearch).mockRejectedValue(new Error("Vector search unavailable"));
    vi.mocked(knowledgeBaseRepository.search).mockResolvedValue(articles as never);

    const result = await searchKnowledgeBase(userId, "refund");

    expect(result).toEqual(articles);
    expect(knowledgeBaseRepository.search).toHaveBeenCalledWith(userId, "refund");
  });

  it("falls back to keyword search when semantic search returns no articles", async () => {
    const articles = [createArticle()];
    vi.mocked(knowledgeBaseRepository.semanticSearch).mockResolvedValue([] as never);
    vi.mocked(knowledgeBaseRepository.search).mockResolvedValue(articles as never);

    const result = await searchKnowledgeBase(userId, "refund");

    expect(result).toEqual(articles);
    expect(knowledgeBaseRepository.search).toHaveBeenCalledWith(userId, "refund");
  });

  it("uses active articles when the search query is empty", async () => {
    const articles = [createArticle()];
    vi.mocked(knowledgeBaseRepository.findActive).mockResolvedValue(articles as never);

    const result = await searchKnowledgeBase(userId, "   ");

    expect(result).toEqual(articles);
    expect(knowledgeBaseRepository.findActive).toHaveBeenCalledWith(userId);
    expect(generateEmbedding).not.toHaveBeenCalled();
    expect(knowledgeBaseRepository.semanticSearch).not.toHaveBeenCalled();
  });

  it("creates a company knowledge-base article and generates its embedding", async () => {
    const createdArticle = createArticle({
      title: "Refund Policy",
      content: "Customers can request a refund within 30 days.",
      category: "refund_policy",
      tags: ["refund", "billing"],
    });
    const updatedArticle = createArticle({
      ...createdArticle,
      embedding: [0.1, 0.2, 0.3],
    });

    vi.mocked(knowledgeBaseRepository.create).mockResolvedValue(createdArticle as never);
    vi.mocked(knowledgeBaseRepository.update).mockResolvedValue(updatedArticle as never);

    const result = await createKnowledgeBaseArticle(userId, {
      title: " Refund Policy ",
      content: " Customers can request a refund within 30 days. ",
      category: "refund_policy",
      tags: ["Refund", " Billing "],
    });

    expect(result).toEqual(updatedArticle);
    expect(knowledgeBaseRepository.create).toHaveBeenCalledWith({
      userId,
      title: "Refund Policy",
      content: "Customers can request a refund within 30 days.",
      category: "refund_policy",
      tags: ["refund", "billing"],
      active: true,
    });
    expect(buildKnowledgeBaseEmbeddingText).toHaveBeenCalled();
    expect(generateEmbedding).toHaveBeenCalled();
    expect(knowledgeBaseRepository.update).toHaveBeenCalledWith(
      userId,
      articleId,
      {embedding: [0.1, 0.2, 0.3]},
    );
  });

  it("rejects an empty article title", async () => {
    await expect(createKnowledgeBaseArticle(userId, {
      title: "   ",
      content: "Some support information.",
    })).rejects.toThrow("Article title is required.");

    expect(knowledgeBaseRepository.create).not.toHaveBeenCalled();
  });

  it("rejects empty article content", async () => {
    await expect(createKnowledgeBaseArticle(userId, {
      title: "FAQ",
      content: "   ",
    })).rejects.toThrow("Article content is required.");

    expect(knowledgeBaseRepository.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid user ID when creating an article", async () => {
    await expect(createKnowledgeBaseArticle("invalid-id", {
      title: "FAQ",
      content: "Frequently asked questions.",
    })).rejects.toThrow("Invalid user ID.");

    expect(knowledgeBaseRepository.create).not.toHaveBeenCalled();
  });

  it("updates a company knowledge-base article and regenerates its embedding", async () => {
    const article = createArticle({
      title: "Product Guide",
      content: "Updated product information.",
      category: "products",
      tags: ["product", "guide"],
    });

    vi.mocked(knowledgeBaseRepository.update)
      .mockResolvedValueOnce(article as never)
      .mockResolvedValueOnce(article as never);

    const result = await updateKnowledgeBaseArticle(userId, articleId, {
      title: " Product Guide ",
      content: " Updated product information. ",
      category: "products",
      tags: ["Product", " Guide "],
      active: true,
    });

    expect(result).toEqual(article);
    expect(knowledgeBaseRepository.update).toHaveBeenNthCalledWith(
      1,
      userId,
      articleId,
      {
        title: "Product Guide",
        content: "Updated product information.",
        category: "products",
        tags: ["product", "guide"],
        active: true,
      },
    );
    expect(buildKnowledgeBaseEmbeddingText).toHaveBeenCalled();
    expect(generateEmbedding).toHaveBeenCalled();
    expect(knowledgeBaseRepository.update).toHaveBeenNthCalledWith(
      2,
      userId,
      articleId,
      {embedding: [0.1, 0.2, 0.3]},
    );
  });

  it("rejects an empty updated title", async () => {
    await expect(updateKnowledgeBaseArticle(userId, articleId, {
      title: "   ",
    })).rejects.toThrow("Article title cannot be empty.");

    expect(knowledgeBaseRepository.update).not.toHaveBeenCalled();
  });

  it("rejects empty updated content", async () => {
    await expect(updateKnowledgeBaseArticle(userId, articleId, {
      content: "   ",
    })).rejects.toThrow("Article content cannot be empty.");

    expect(knowledgeBaseRepository.update).not.toHaveBeenCalled();
  });

  it("returns null when the article to update does not exist", async () => {
    vi.mocked(knowledgeBaseRepository.update).mockResolvedValueOnce(null as never);

    const result = await updateKnowledgeBaseArticle(userId, articleId, {
      title: "Updated article",
    });

    expect(result).toBeNull();
    expect(generateEmbedding).not.toHaveBeenCalled();
  });

  it("deletes a company knowledge-base article", async () => {
    const article = createArticle();
    vi.mocked(knowledgeBaseRepository.delete).mockResolvedValue(article as never);

    const result = await deleteKnowledgeBaseArticle(userId, articleId);

    expect(result).toEqual(article);
    expect(knowledgeBaseRepository.delete).toHaveBeenCalledWith(userId, articleId);
  });

  it("rejects invalid IDs when deleting an article", async () => {
    await expect(deleteKnowledgeBaseArticle("invalid-id", articleId)).rejects.toThrow("Invalid user or article ID.");
    await expect(deleteKnowledgeBaseArticle(userId, "invalid-id")).rejects.toThrow("Invalid user or article ID.");
    expect(knowledgeBaseRepository.delete).not.toHaveBeenCalled();
  });

  it("gets relevant company knowledge through the knowledge-base search", async () => {
    const articles = [createArticle()];
    vi.mocked(knowledgeBaseRepository.semanticSearch).mockResolvedValue(articles as never);

    const result = await getRelevantKnowledgeBase(userId, "billing information");

    expect(result).toEqual(articles);
    expect(knowledgeBaseRepository.semanticSearch).toHaveBeenCalledWith(userId, [0.1, 0.2, 0.3], 5);
  });
});
