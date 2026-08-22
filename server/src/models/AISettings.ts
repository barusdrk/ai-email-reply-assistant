import {
  Schema,
  model,
  type InferSchemaType,
} from "mongoose";

const aiSettingsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    provider: {
      type: String,
      enum: [
        "openai",
        "gemini",
        "groq",
        "claude",
        "mock",
      ],
      default: "gemini",
    },
    defaultReplyTone: {
      type: String,
      enum: [
        "friendly",
        "formal",
        "professional",
        "concise",
        "empathetic",
        "enthusiastic",
      ],
      default: "formal",
    },
    defaultLength: {
      type: String,
      enum: [
        "short",
        "medium",
        "long",
      ],
      default: "medium",
    },
    maxDailyReplies: {
      type: Number,
      default: 20,
    },
    temperature: {
      type: Number,
      default: 0.7,
    },
    autoDraft: {
      type: Boolean,
      default: false,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    desktopNotifications: {
      type: Boolean,
      default: false,
    },
    signature: {
      type: String,
      default: "Customer Support",
    },
  },
  {
    timestamps: true,
  }
);

export type AISettingsDocument =
  InferSchemaType<
    typeof aiSettingsSchema
  >;

export default model(
  "AISettings",
  aiSettingsSchema
);
