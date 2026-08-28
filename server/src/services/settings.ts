import { Types } from "mongoose";
import { aiSettingsRepository } from "../repositories/AISettingsRepository.js";

export type AIProvider = "mock" | "openai" | "gemini" | "groq" | "claude";
export type ReplyTone = "professional" | "friendly" | "formal" | "empathetic" | "concise" | "enthusiastic";
export type ReplyLength = "short" | "medium" | "long";

export interface SettingsUpdate {
  provider?: AIProvider;
  maxDailyReplies?: number;
  temperature?: number;
  defaultReplyTone?: ReplyTone;
  defaultLength?: ReplyLength;
  signature?: string;
  autoDraft?: boolean;
  emailNotifications?: boolean;
  desktopNotifications?: boolean;
}

const DEFAULT_SETTINGS = {
  provider: "gemini" as AIProvider,
  defaultReplyTone: "formal" as ReplyTone,
  defaultLength: "medium" as ReplyLength,
  maxDailyReplies: 20,
  temperature: 0.7,
  signature: "Customer Support",
  autoDraft: false,
  emailNotifications: true,
  desktopNotifications: false,
};

export async function getSettings(userId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  let settings = await aiSettingsRepository.findByUser(userId);

  if (!settings) {
    settings = await aiSettingsRepository.create({
      userId: new Types.ObjectId(userId),
      ...DEFAULT_SETTINGS,
    });
  }

  return settings;
}

export async function updateSettings(
  userId: string,
  data: SettingsUpdate
) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  return aiSettingsRepository.update(userId, data);
}

export async function resetSettings(userId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  return aiSettingsRepository.update(
    userId,
    DEFAULT_SETTINGS
  );
}
