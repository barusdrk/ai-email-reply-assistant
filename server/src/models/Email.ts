import {
  Schema,
  model,
  type InferSchemaType,
  type HydratedDocument,
} from "mongoose";

const emailSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["gmail", "outlook", "sample"],
      required: true,
    },
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    threadId: {
      type: String,
      default: null,
    },
    subject: {
      type: String,
      default: "",
      trim: true,
    },
    from: {
      type: String,
      required: true,
      trim: true,
    },
    preview: {
      type: String,
      default: "",
    },
    body: {
      type: String,
      default: "",
    },
    unread: {
      type: Boolean,
      default: true,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    isSample: {
      type: Boolean,
      default: false,
      index: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    draftId: {
      type: Schema.Types.ObjectId,
      ref: "Draft",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

emailSchema.index({
  userId: 1,
  provider: 1,
  messageId: 1,
});

export type Email =
  InferSchemaType<typeof emailSchema>;

export type EmailDocument =
  HydratedDocument<Email>;

export default model<Email>(
  "Email",
  emailSchema
);
