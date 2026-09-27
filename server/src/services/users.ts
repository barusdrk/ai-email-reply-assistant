import bcrypt from "bcrypt";
import { Types } from "mongoose";
import UserModel from "../models/User.js";
import AISettingsModel from "../models/AISettings.js";
import ApprovalModel from "../models/Approval.js";
import AuditLogModel from "../models/AuditLog.js";
import ConnectedAccountModel from "../models/ConnectedAccount.js";
import DraftModel from "../models/Draft.js";
import EmailModel from "../models/Email.js";
import NotificationModel from "../models/Notification.js";
import SubscriptionModel from "../models/Subscription.js";

const AVATAR_DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function validateAvatar(avatar: string) {
  if (avatar === "") return;
  const match = AVATAR_DATA_URL_PATTERN.exec(avatar);
  if (!match || match[2].length % 4 !== 0) {
    throw new Error("Avatar must be a JPEG, PNG, GIF, or WebP image.");
  }
  const encodedImage = match[2];
  const padding = encodedImage.endsWith("==") ? 2 : encodedImage.endsWith("=") ? 1 : 0;
  const sizeInBytes = (encodedImage.length * 3) / 4 - padding;
  if (sizeInBytes > MAX_AVATAR_BYTES) {
    throw new Error("Avatar image must be 2 MB or smaller.");
  }
}

export async function me(userId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  const user = await UserModel.findById(userId).select("-password");

  if (!user) {
    throw new Error("User not found.");
  }

  return user;
}

export async function updateProfile(userId: string, data: {
  name?: string;
  email?: string;
  avatar?: string;
}) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  const updates: {
    name?: string;
    email?: string;
    avatar?: string;
  } = {};

  if (data.name !== undefined) {
    updates.name = data.name.trim();
  }

  if (data.email !== undefined) {
    updates.email = data.email.trim().toLowerCase();
  }

  if (data.avatar !== undefined) {
    validateAvatar(data.avatar);
    updates.avatar = data.avatar;
  }

  const user = await UserModel.findByIdAndUpdate(
    userId,
    updates,
    {
      new: true,
      runValidators: true,
    }
  ).select("-password");

  if (!user) {
    throw new Error("User not found.");
  }

  return user;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  if (!currentPassword || !newPassword) {
    throw new Error("Current and new passwords are required.");
  }

  if (newPassword.length < 6) {
    throw new Error(
      "New password must be at least 6 characters."
    );
  }

  const user = await UserModel.findById(userId);

  if (!user) {
    throw new Error("User not found.");
  }

  const passwordMatches = await bcrypt.compare(
    currentPassword,
    user.password
  );

  if (!passwordMatches) {
    throw new Error("Current password is incorrect.");
  }

  if (currentPassword === newPassword) {
    throw new Error(
      "New password must be different from the current password."
    );
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return {
    success: true,
    message: "Password changed successfully.",
  };
}

export async function deleteAccount(userId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  const userObjectId = new Types.ObjectId(userId);
  const user = await UserModel.findById(userObjectId);

  if (!user) {
    throw new Error("User not found.");
  }

  await Promise.all([
    AISettingsModel.deleteOne({
      userId: userObjectId,
    }),
    ApprovalModel.deleteMany({
      userId: userObjectId,
    }),
    AuditLogModel.deleteMany({
      userId: userObjectId,
    }),
    ConnectedAccountModel.deleteMany({
      userId: userObjectId,
    }),
    DraftModel.deleteMany({
      userId: userObjectId,
    }),
    EmailModel.deleteMany({
      userId: userObjectId,
    }),
    NotificationModel.deleteMany({
      userId: userObjectId,
    }),
    SubscriptionModel.deleteMany({
      userId: userObjectId,
    }),
  ]);

  await UserModel.deleteOne({
    _id: userObjectId,
  });

  return {
    success: true,
    message: "Account and related data deleted successfully.",
  };
}
