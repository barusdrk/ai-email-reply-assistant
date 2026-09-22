import {draftRepository} from "../repositories/DraftRepository.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {generateReply} from "./openai.js";
import {determineAutomaticAction} from "./automaticActions.js";
import {analyzeDraftSupport, applySupportDecision, evaluateDraftPolicy, scoreDraftConfidence} from "./draftSupport.js";
import {isValidObjectId} from "./draftValidation.js";
import {SUPPORT_CATEGORIES, type SupportCategory} from "../models/Draft.js";
import type {CreateDraftData} from "./draftTypes.js";

function normalizeSupportCategory(value: string): SupportCategory {
  return (SUPPORT_CATEGORIES as readonly string[]).includes(value)
    ? value as SupportCategory
    : "general_support";
}

export async function createDraft(data: CreateDraftData) {
  if (!isValidObjectId(data.userId)) throw new Error("Invalid user ID.");
  if (!isValidObjectId(data.emailId)) throw new Error("Invalid source email ID.");

  const tone = data.tone ?? "professional";
  const length = data.length ?? "medium";
  const support = await analyzeDraftSupport(data.userId, data.emailId, data.customer, tone, length);
  const supportResult = support.supportResult;
  const reply = data.reply?.trim()
    ? data.reply.trim()
    : supportResult.reply.trim()
      ? supportResult.reply.trim()
      : await generateReply({
          userId: data.userId,
          email: support.customerEmailBody,
          tone,
          length,
          knowledgeBase: support.knowledgeBase ?? [],
          conversationHistory: support.conversationHistory.map((message) => ({
            role: message.role,
            subject: message.subject,
            content: message.content,
            timestamp: message.timestamp ? message.timestamp.toISOString() : "unknown",
          })),
        });

  if (!reply.trim()) throw new Error("AI generated an empty reply.");

  const confidence = await scoreDraftConfidence(data.userId, support.customerEmailBody, reply, support.knowledgeBase);
  const policy = await evaluateDraftPolicy(data.userId, support.customerEmailBody, reply, support.knowledgeBase);
  const automaticAction = applySupportDecision(determineAutomaticAction(support.customerEmailBody, confidence, policy), supportResult);
  const status = automaticAction.action === "escalate"
    ? "escalated"
    : automaticAction.action === "auto_approve"
      ? "approved"
      : automaticAction.action === "blocked"
        ? "rejected"
        : "pending";
  const now = new Date();

  const createdDraft = await draftRepository.create({
    userId: data.userId as any,
    emailId: data.emailId as any,
    provider: data.provider,
    subject: data.subject,
    customer: data.customer.trim(),
    reply,
    tone,
    length,
    status,
    confidence,
    automaticAction: automaticAction.action,
    automaticActionReasons: automaticAction.reasons,
    supportCategory: normalizeSupportCategory(supportResult.category),
    supportSentiment: supportResult.sentiment,
    supportConfidence: supportResult.confidence,
    supportDecision: supportResult.decision,
    supportNeedsHuman: supportResult.needsHuman,
    supportReason: supportResult.reason,
    supportSuggestedActions: supportResult.suggestedActions,
    supportMissingInformation: supportResult.missingInformation,
    supportPolicyIssues: supportResult.policyIssues,
    escalatedAt: status === "escalated" ? now : undefined,
    escalationReason: status === "escalated" ? automaticAction.reasons[0] : undefined,
    escalationReasons: status === "escalated" ? automaticAction.reasons : [],
    approvedAt: status === "approved" ? now : undefined,
    rejectionReason: status === "rejected" ? automaticAction.reasons.join(" ") : undefined,
  });

  await emailRepository.update(data.emailId, {draftId: createdDraft._id});
  return createdDraft;
}
