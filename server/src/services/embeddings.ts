import OpenAI from "openai";
import { env } from "../config/env.js";

const EMBEDDING_MODEL = "text-embedding-3-small";

function getClient() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OpenAI is not configured.");
  }

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
}

export function buildKnowledgeBaseEmbeddingText(input: {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}) {
  return [
    `Title: ${input.title}`,
    `Category: ${input.category ?? "general"}`,
    `Tags: ${(input.tags ?? []).join(", ")}`,
    `Content: ${input.content}`,
  ].join("\n");
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const value = text.trim();

  if (!value) {
    throw new Error("Embedding text cannot be empty.");
  }

  const response = await getClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: value,
  });

  const embedding = response.data[0]?.embedding;

  if (!embedding) {
    throw new Error("Failed to generate embedding.");
  }

  return embedding;
}
