import {
  Schema,
  model,
  Types,
  type InferSchemaType,
  type HydratedDocument,
} from "mongoose";

const draftSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    emailId: {
      type: Schema.Types.ObjectId,
      ref: "Email",
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    customer: {
      type: String,
      required: true,
      trim: true,
    },
    reply: {
      type: String,
      required: true,
    },
    tone: {
      type: String,
      enum: [
        "professional",
        "friendly",
        "formal",
        "empathetic",
      ],
      default: "professional",
    },
    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "sent",
      ],
      default: "pending",
    },
    approvedAt: Date,
    rejectionReason: String,
    sentAt: Date,
  },
  {
    timestamps: true,
  }
);

export type Draft =
  InferSchemaType<
    typeof draftSchema
  >;

export type DraftDocument =
  HydratedDocument<Draft>;

export default model<Draft>(
  "Draft",
  draftSchema
);
