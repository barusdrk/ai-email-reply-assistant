import API from "./api.js";
import type { AISettings, AIProvider, ReplyTone, Theme } from "../types/settings.js";

export type { AISettings, AIProvider, ReplyTone, Theme };

interface SettingsResponse {
  success?: boolean;
  settings?: AISettings;
}

export async function getSettings(): Promise<AISettings> {
  const { data } = await API.get<AISettings | SettingsResponse>("/settings");
  if ("settings" in data && data.settings) return data.settings;
  return data as AISettings;
}

export async function updateSettings(settings: Partial<AISettings>): Promise<AISettings> {
  const { data } = await API.put<AISettings | SettingsResponse>("/settings", settings);
  if ("settings" in data && data.settings) return data.settings;
  return data as AISettings;
}

export async function updateProvider(provider: AIProvider): Promise<AISettings> {
  return updateSettings({ provider });
}

export async function updateDefaultReplyTone(defaultReplyTone: ReplyTone): Promise<AISettings> {
  return updateSettings({ defaultReplyTone });
}

export async function updateDefaultLength(defaultLength: "short" | "medium" | "long"): Promise<AISettings> {
  return updateSettings({ defaultLength });
}

export async function updateAutoDraft(autoDraft: boolean): Promise<AISettings> {
  return updateSettings({ autoDraft });
}

export async function updateApiKeys(keys: { openAiApiKey?: string; groqApiKey?: string; geminiApiKey?: string }): Promise<AISettings> {
  return updateSettings(keys);
}

export async function updateAppearance(data: { theme?: Theme; language?: string; timezone?: string }): Promise<AISettings> {
  return updateSettings(data);
}
