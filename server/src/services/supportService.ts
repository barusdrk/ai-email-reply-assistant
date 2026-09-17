import {buildCustomerContext} from "./customerContext.js";
import {searchKnowledgeBase} from "./knowledgeBase.js";
import {getCompanyPolicies} from "./companyPolicies.js";
import {getConversationHistory} from "./conversationMemory.js";
import {analyzeSupportRequest, generateSupportReply, shouldAutoReply, type SupportEngineInput, type SupportEngineResult} from "./supportEngine.js";
import {scoreReplyConfidence, type ConfidenceScore} from "./confidenceScoring.js";
import {checkReplyPolicy, type PolicyCheckResult} from "./policyChecker.js";

export interface SupportServiceInput {
  userId: string;
  customerMessage: string;
  threadId?: string;
  excludeEmailId?: string;
  customerContext?: SupportEngineInput["customerContext"];
  tone?: SupportEngineInput["tone"];
  length?: SupportEngineInput["length"];
}

export interface SupportServiceResult {
  supportResult: SupportEngineResult;
  confidence?: ConfidenceScore;
  policy?: PolicyCheckResult;
  autoReply: boolean;
  knowledgeBase: Awaited<ReturnType<typeof searchKnowledgeBase>>;
  companyPolicies: Awaited<ReturnType<typeof getCompanyPolicies>>;
  conversationHistory: Awaited<ReturnType<typeof getConversationHistory>>;
}

async function buildSupportInput(input: SupportServiceInput): Promise<{
  supportInput: SupportEngineInput;
  knowledgeBase: Awaited<ReturnType<typeof searchKnowledgeBase>>;
  companyPolicies: Awaited<ReturnType<typeof getCompanyPolicies>>;
  conversationHistory: Awaited<ReturnType<typeof getConversationHistory>>;
}> {
  const customerMessage = input.customerMessage.trim();
  if (!customerMessage) throw new Error("Customer message is required.");
  const knowledgeBase = await searchKnowledgeBase(input.userId, customerMessage);
  const companyPolicies = await getCompanyPolicies(input.userId);
  const conversationHistory = input.threadId
    ? await getConversationHistory(input.userId, input.threadId, input.excludeEmailId)
    : [];
  const supportConversationHistory = conversationHistory.map((message) => ({
    role: message.role === "customer" ? "customer" as const : "agent" as const,
    content: message.content,
    createdAt: message.timestamp ?? undefined,
  }));
  const customerContext = buildCustomerContext(input.customerContext ?? {});
  return {
    supportInput: {
      customerMessage,
      conversationHistory: supportConversationHistory,
      knowledgeBase: (knowledgeBase ?? []).map((item) => ({
        title: item.title,
        content: item.content,
      })),
      customerContext,
      companyPolicies,
      tone: input.tone,
      length: input.length,
    },
    knowledgeBase,
    companyPolicies,
    conversationHistory,
  };
}

export async function analyzeCustomerSupport(input: SupportServiceInput): Promise<SupportServiceResult> {
  const context = await buildSupportInput(input);
  const supportResult = await analyzeSupportRequest(context.supportInput);
  let confidence: ConfidenceScore | undefined;
  let policy: PolicyCheckResult | undefined;
  if (supportResult.decision === "reply" && supportResult.reply) {
    confidence = await scoreReplyConfidence({
      email: input.customerMessage.trim(),
      reply: supportResult.reply,
      knowledgeBase: context.knowledgeBase ?? [],
    });
    policy = await checkReplyPolicy({
      email: input.customerMessage.trim(),
      reply: supportResult.reply,
      knowledgeBase: context.knowledgeBase ?? [],
    });
  }
  const autoReply =
    supportResult.decision === "reply" &&
    !supportResult.needsHuman &&
    supportResult.policyIssues.length === 0 &&
    Boolean(supportResult.reply) &&
    (confidence === undefined || confidence.score >= 0.75) &&
    (policy === undefined || policy.violations.length === 0);
  return {
    supportResult,
    confidence,
    policy,
    autoReply,
    knowledgeBase: context.knowledgeBase,
    companyPolicies: context.companyPolicies,
    conversationHistory: context.conversationHistory,
  };
}

export async function generateCustomerSupportReply(input: SupportServiceInput): Promise<SupportServiceResult> {
  const context = await buildSupportInput(input);
  const supportResult = await generateSupportReply(context.supportInput);
  let confidence: ConfidenceScore | undefined;
  let policy: PolicyCheckResult | undefined;
  if (supportResult.decision === "reply" && supportResult.reply) {
    confidence = await scoreReplyConfidence({
      email: input.customerMessage.trim(),
      reply: supportResult.reply,
      knowledgeBase: context.knowledgeBase ?? [],
    });
    policy = await checkReplyPolicy({
      email: input.customerMessage.trim(),
      reply: supportResult.reply,
      knowledgeBase: context.knowledgeBase ?? [],
    });
  }
  const autoReply =
    supportResult.decision === "reply" &&
    !supportResult.needsHuman &&
    supportResult.policyIssues.length === 0 &&
    Boolean(supportResult.reply) &&
    (confidence === undefined || confidence.score >= 0.75) &&
    (policy === undefined || policy.violations.length === 0);
  return {
    supportResult,
    confidence,
    policy,
    autoReply,
    knowledgeBase: context.knowledgeBase,
    companyPolicies: context.companyPolicies,
    conversationHistory: context.conversationHistory,
  };
}

export async function canAutomaticallyReply(input: SupportServiceInput): Promise<boolean> {
  const context = await buildSupportInput(input);
  return shouldAutoReply(context.supportInput);
}
