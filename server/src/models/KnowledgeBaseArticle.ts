import {Schema, model, type InferSchemaType} from "mongoose";

export const KNOWLEDGE_BASE_CATEGORIES = ["products", "pricing", "billing", "refund_policy", "shipping", "account_management", "troubleshooting", "faq", "cancellation", "technical", "policy", "general"] as const;
export type KnowledgeBaseCategory = (typeof KNOWLEDGE_BASE_CATEGORIES)[number];

const knowledgeBaseArticleSchema = new Schema({
  userId: {type: Schema.Types.ObjectId, ref: "User", required: true, index: true},
  title: {type: String, required: true, trim: true},
  content: {type: String, required: true, trim: true},
  category: {type: String, enum: KNOWLEDGE_BASE_CATEGORIES, default: "general"},
  tags: {type: [String], default: []},
  active: {type: Boolean, default: true, index: true},
  embedding: {type: [Number], default: []},
}, {timestamps: true});

knowledgeBaseArticleSchema.index({userId: 1, category: 1, active: 1});
knowledgeBaseArticleSchema.index({userId: 1, title: 1});
knowledgeBaseArticleSchema.index({userId: 1, tags: 1});

export type KnowledgeBaseArticle = InferSchemaType<typeof knowledgeBaseArticleSchema>;
export type KnowledgeBaseArticleDocument = KnowledgeBaseArticle;
export const KnowledgeBaseArticleModel = model<KnowledgeBaseArticle>("KnowledgeBaseArticle", knowledgeBaseArticleSchema);
export default KnowledgeBaseArticleModel;
