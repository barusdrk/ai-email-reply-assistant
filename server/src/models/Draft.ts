import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

export const DRAFT_TONES = [
  "professional",
  "friendly",
  "formal",
  "concise",
  "empathetic",
  "enthusiastic",
] as const;
export type DraftTone = (typeof DRAFT_TONES)[number];

export const DRAFT_LENGTHS = ["short", "medium", "long"] as const;
export type DraftLength = (typeof DRAFT_LENGTHS)[number];

export const DRAFT_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "sent",
  "escalated",
] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

export const DRAFT_PROVIDERS = ["gmail", "outlook", "sample"] as const;
export type DraftProvider = (typeof DRAFT_PROVIDERS)[number];

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const AUTOMATIC_ACTIONS = [
  "auto_approve",
  "pending",
  "escalate",
  "blocked",
] as const;
export type AutomaticAction = (typeof AUTOMATIC_ACTIONS)[number];

const draftSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    emailId: {
      type: Schema.Types.ObjectId,
      ref: "Email",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: DRAFT_PROVIDERS,
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
      enum: DRAFT_TONES,
      default: "professional",
    },
    length: {
      type: String,
      enum: DRAFT_LENGTHS,
      default: "medium",
    },
    status: {
      type: String,
      enum: DRAFT_STATUSES,
      default: "pending",
      index: true,
    },
    confidence: {
      score: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },
      level: {
        type: String,
        enum: CONFIDENCE_LEVELS,
        default: null,
      },
      reasons: {
        type: [String],
        default: [],
      },
    },
    automaticAction: {
      type: String,
      enum: AUTOMATIC_ACTIONS,
      default: null,
      index: true,
    },
    automaticActionReasons: {
      type: [String],
      default: [],
    },
    escalatedAt: Date,
    escalationReason: String,
    escalationReasons: {
      type: [String],
      default: [],
    },
    approvedAt: Date,
    rejectionReason: String,
    sentAt: Date,
  },
  {
    timestamps: true,
  }
);

draftSchema.index({ userId: 1, status: 1 });
draftSchema.index({ userId: 1, createdAt: -1 });
draftSchema.index({ userId: 1, automaticAction: 1 });

export type Draft = InferSchemaType<typeof draftSchema>;
export type DraftDocument = HydratedDocument<Draft>;

export default model<Draft>("Draft", draftSchema);