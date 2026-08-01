import {
  Schema,
  model,
  type InferSchemaType,
} from "mongoose";

const subscriptionSchema =
  new Schema(
    {
      userId: {
        type:
          Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
      },

      plan: {
        type: String,
        enum: [
          "free",
          "starter",
          "pro",
        ],
        default: "free",
      },

      status: {
        type: String,
        enum: [
          "active",
          "cancelled",
          "expired",
        ],
        default: "active",
      },

      provider: {
        type: String,
        enum: [
          "stripe",
          "none",
        ],
        default: "none",
      },

      customerId: {
        type: String,
        default: null,
      },

      subscriptionId: {
        type: String,
        default: null,
      },

      currentPeriodStart: {
        type: Date,
        default: null,
      },

      currentPeriodEnd: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

export type SubscriptionDocument =
  InferSchemaType<
    typeof subscriptionSchema
  >;

export const SubscriptionModel =
  model(
    "Subscription",
    subscriptionSchema
  );

export default SubscriptionModel;
