import {
  Schema,
  model,
  type InferSchemaType,
} from "mongoose";

const connectedAccountSchema =
  new Schema(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      provider: {
        type: String,
        enum: ["gmail", "outlook"],
        required: true,
      },
      email: {
        type: String,
        required: true,
        trim: true,
      },
      connected: {
        type: Boolean,
        default: true,
      },
      accessToken: {
        type: String,
        default: null,
      },
      refreshToken: {
        type: String,
        default: null,
      },
      expiresAt: {
        type: Date,
      },
      lastSyncAt: {
        type: Date,
      },
      syncStatus: {
        type: String,
        enum: [
          "idle",
          "syncing",
          "error",
        ],
        default: "idle",
      },
      lastError: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

connectedAccountSchema.index({
  userId: 1,
  provider: 1,
});

export type ConnectedAccountDocument =
  InferSchemaType<
    typeof connectedAccountSchema
  >;

const ConnectedAccountModel =
  model(
    "ConnectedAccount",
    connectedAccountSchema
  );

export default ConnectedAccountModel;
export { ConnectedAccountModel };
