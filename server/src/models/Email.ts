import { Schema, model, type InferSchemaType } from "mongoose";

const emailCategories = ["refund", "cancellation", "billing", "account", "technical", "shipping", "product", "feature_request", "complaint", "other"] as const;

const emailSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    provider: { type: String, enum: ["gmail", "outlook", "sample"], required: true },
    messageId: { type: String, required: true },
    messageIdHeader: { type: String, default: "" },
    references: { type: [String], default: [] },
    threadId: { type: String, default: null },
    subject: { type: String, default: "", trim: true },
    from: { type: String, default: "", trim: true },
    senderName: { type: String, default: "", trim: true },
    senderEmail: { type: String, default: "", trim: true },
    preview: { type: String, default: "" },
    body: { type: String, default: "" },
    classification: {
      category: { type: String, enum: emailCategories, default: "other" },
      confidence: { type: Number, default: 0, min: 0, max: 1 },
    },
    isSample: { type: Boolean, default: false },
    unread: { type: Boolean, default: true },
    archived: { type: Boolean, default: false },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

emailSchema.index({ userId: 1, provider: 1, messageId: 1 }, { unique: true });
emailSchema.index({ userId: 1, receivedAt: -1 });
emailSchema.index({ userId: 1, threadId: 1 });
emailSchema.index({ userId: 1, customerId: 1 });

export type EmailDocument = InferSchemaType<typeof emailSchema>;
export const EmailModel = model("Email", emailSchema);
export default EmailModel;
