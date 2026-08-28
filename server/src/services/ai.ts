import { createAIProvider, type AIProviderName } from "../ai/factory.js";
import { aiSettingsRepository } from "../repositories/AISettingsRepository.js";
import type { GenerateReplyInput } from "../ai/types.js";

async function getUserAIProvider(userId: string) {
  const settings = await aiSettingsRepository.findByUser(userId);
  const providerName = (settings?.provider ?? "gemini") as AIProviderName;
  return createAIProvider(providerName);
}

export async function generateReplyForUser(userId: string, input: GenerateReplyInput): Promise<string> {
  const provider = await getUserAIProvider(userId);
  return provider.generateReply(input);
}

export async function summarizeEmailForUser(userId: string, email: string): Promise<string> {
  const provider = await getUserAIProvider(userId);
  return provider.summarize({ text: email });
}

export async function classifyEmailForUser(userId: string, email: string) {
  const provider = await getUserAIProvider(userId);
  return {
    category: await provider.classify({ text: email }),
  };
}
