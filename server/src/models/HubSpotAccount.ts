import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const hubSpotAccountSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    hubId: {
      type: String,
      required: true,
      index: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    connected: {
      type: Boolean,
      default: true,
      index: true,
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export type HubSpotAccount = InferSchemaType<typeof hubSpotAccountSchema>;
export type HubSpotAccountDocument = HydratedDocument<HubSpotAccount>;

const HubSpotAccountModel = model<HubSpotAccount>("HubSpotAccount", hubSpotAccountSchema);

export default HubSpotAccountModel;
