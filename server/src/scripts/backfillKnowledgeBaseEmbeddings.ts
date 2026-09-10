import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import KnowledgeBaseArticleModel from "../models/KnowledgeBaseArticle.js";
import {
  buildKnowledgeBaseEmbeddingText,
  generateEmbedding,
} from "../services/embeddings.js";

dotenv.config();

async function backfill() {
  await connectDatabase();

  const articles = await KnowledgeBaseArticleModel.find({
    $or: [
      { embedding: { $exists: false } },
      { embedding: { $size: 0 } },
    ],
  });

  console.log(`Found ${articles.length} articles without embeddings.`);

  for (const article of articles) {
    const embeddingText = buildKnowledgeBaseEmbeddingText({
      title: article.title,
      content: article.content,
      category: article.category,
      tags: article.tags,
    });

    const embedding = await generateEmbedding(embeddingText);

    await KnowledgeBaseArticleModel.updateOne(
      { _id: article._id },
      { $set: { embedding } }
    );

    console.log(`Embedded: ${article.title}`);
  }

  console.log("Knowledge base embedding backfill complete.");
  await mongoose.disconnect();
}

backfill().catch(async (error) => {
  console.error("Knowledge base embedding backfill failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
