import { createAIProvider, type AIProviderName } from "../ai/factory.js";
import { aiSettingsRepository } from "../repositories/AISettingsRepository.js";
import { searchKnowledgeBase } from "./knowledgeBase.js";
import { scoreReplyConfidence } from "./confidenceScoring.js";
import { checkReplyPolicy, type PolicyCheckResult } from "./policyChecker.js";
import type { ConfidenceScore, GenerateReplyInput } from "../ai/types.js";

async function getUserAIProvider(userId: string) {
  const settings = await aiSettingsRepository.findByUser(userId);
  const providerName = (settings?.provider ?? "openai") as AIProviderName;
  console.log("AI settings:", { provider: settings?.provider, resolved: providerName });
  return createAIProvider(providerName);
}

export interface GenerateReplyResult {
  reply: string;
  confidence: ConfidenceScore;
  policyCheck: PolicyCheckResult;
}

export async function generateReplyForUser(userId: string, input: GenerateReplyInput): Promise<GenerateReplyResult> {
  const provider = await getUserAIProvider(userId);
  const knowledgeBase = await searchKnowledgeBase(userId, input.email);
  console.log("AI provider used:", provider.name);
  console.log("Knowledge base articles used:", knowledgeBase?.length ?? 0);

  const reply = await provider.generateReply({
    ...input,
    knowledgeBase: knowledgeBase ?? [],
  });

  const confidence = await scoreReplyConfidence({
    email: input.email,
    reply,
    knowledgeBase: knowledgeBase ?? [],
  });

  console.log("Confidence score:", {
    score: confidence.score,
    level: confidence.level,
  });

  const policyCheck = await checkReplyPolicy({
    email: input.email,
    reply,
    knowledgeBase: knowledgeBase ?? [],
  });

  console.log("Policy check:", {
    compliant: policyCheck.compliant,
    score: policyCheck.score,
    violations: policyCheck.violations.length,
  });

  return { reply, confidence, policyCheck };
}

export async function summarizeEmailForUser(userId: string, email: string): Promise<string> {
  const provider = await getUserAIProvider(userId);
  return provider.summarize({ text: email });
}

export async function classifyEmailForUser(userId: string, email: string) {
  const provider = await getUserAIProvider(userId);
  return { category: await provider.classify({ text: email }) };
}
