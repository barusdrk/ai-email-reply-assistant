import {
  Types,
} from "mongoose";

import {
  aiSettingsRepository,
} from "../repositories/AISettingsRepository.js";

export async function getSettings(
  userId:string
) {
  let settings =
    await aiSettingsRepository.findByUser(
      userId
    );

  if (!settings) {
    settings =
      await aiSettingsRepository.create({
        userId:
          new Types.ObjectId(userId),
        provider:"gemini",
        maxDailyReplies:20,
        temperature:0.7,
      });
  }

  return settings;
}

export async function updateSettings(
  userId:string,
  data:{
    provider?:
      | "openai"
      | "gemini";
    maxDailyReplies?:number;
    temperature?:number;
    defaultTone?:string;
    defaultLength?:string;
  }
) {
  return aiSettingsRepository.update(
    userId,
    data
  );
}

export async function resetSettings(
  userId:string
) {
  return aiSettingsRepository.update(
    userId,
    {
      provider:"gemini",
      maxDailyReplies:20,
      temperature:0.7,
      defaultTone:"professional",
      defaultLength:"medium",
    }
  );
}
