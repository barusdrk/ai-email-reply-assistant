import {
  Schema,
  model,
  type InferSchemaType,
} from "mongoose";

const userSchema =
  new Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },

      password: {
        type: String,
        required: true,
      },

      role: {
        type: String,
        enum: [
          "user",
          "admin",
        ],
        default: "user",
      },

      plan: {
        type: String,
        enum: [
          "starter",
          "pro",
          "enterprise",
        ],
        default: "starter",
      },

      subscriptionStatus: {
        type: String,
        enum: [
          "active",
          "inactive",
          "cancelled",
          "trial",
        ],
        default: "trial",
      },

      avatar: {
        type: String,
        default: "",
      },

      emailVerified: {
        type: Boolean,
        default: false,
      },

      lastLoginAt: {
        type: Date,
      },

      active: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

export type UserDocument =
  InferSchemaType<
    typeof userSchema
  >;

export const UserModel =
  model(
    "User",
    userSchema
  );

export default UserModel;
