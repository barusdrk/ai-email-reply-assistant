import { Schema, model, type InferSchemaType } from "mongoose";

const conversationHistorySchema = new Schema(
  {
    emailId: { type: Schema.Types.ObjectId, ref: "Email" },
    threadId: { type: String, default: "", trim: true },
    subject: { type: String, default: "", trim: true },
    category: { type: String, default: "general_support", trim: true },
    sentiment: {
      type: String,
      enum: ["positive", "neutral", "negative", "urgent"],
      default: "neutral",
    },
    summary: { type: String, default: "", trim: true },
    lastMessageAt: { type: Date },
  },
  { _id: false }
);

const supportHistorySchema = new Schema(
  {
    emailId: { type: Schema.Types.ObjectId, ref: "Email" },
    draftId: { type: Schema.Types.ObjectId, ref: "Draft" },
    action: {
      type: String,
      enum: ["replied", "approved", "rejected", "escalated", "blocked"],
      required: true,
    },
    category: { type: String, default: "general_support", trim: true },
    confidence: { type: Number, min: 0, max: 1 },
    summary: { type: String, default: "", trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const customerSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, default: "", trim: true },
    company: { type: String, default: "", trim: true },
    crmId: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["active", "inactive", "at_risk", "vip", "blocked"],
      default: "active",
    },
    tags: { type: [String], default: [] },
    notes: { type: String, default: "", trim: true },
    conversationHistory: {
      type: [conversationHistorySchema],
      default: [],
    },
    supportHistory: {
      type: [supportHistorySchema],
      default: [],
    },
  },
  { timestamps: true }
);

customerSchema.index({ userId: 1, email: 1 }, { unique: true });
customerSchema.index({ userId: 1, crmId: 1 }, { sparse: true });
customerSchema.index({ userId: 1, status: 1 });
customerSchema.index({ userId: 1, updatedAt: -1 });

export type CustomerDocument = InferSchemaType<typeof customerSchema>;
export const CustomerModel = model("Customer", customerSchema);
export default CustomerModel;
