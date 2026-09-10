import { Schema, model, type InferSchemaType } from "mongoose";

const knowledgeBaseCategories = ["faq", "product", "billing", "refund", "cancellation", "shipping", "account", "technical", "policy", "general"] as const;

const knowledgeBaseArticleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    category: { type: String, enum: knowledgeBaseCategories, default: "general" },
    tags: { type: [String], default: [] },
    active: { type: Boolean, default: true, index: true },
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true }
);

knowledgeBaseArticleSchema.index({ userId: 1, category: 1, active: 1 });
knowledgeBaseArticleSchema.index({ userId: 1, title: 1 });
knowledgeBaseArticleSchema.index({ userId: 1, tags: 1 });

export type KnowledgeBaseArticleDocument = InferSchemaType<typeof knowledgeBaseArticleSchema>;
export const KnowledgeBaseArticleModel = model("KnowledgeBaseArticle", knowledgeBaseArticleSchema);
export default KnowledgeBaseArticleModel;
