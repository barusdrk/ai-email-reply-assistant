import {Types} from "mongoose";
import {draftRepository} from "../repositories/DraftRepository.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {generateReply} from "./openai.js";
import {determineAutomaticAction} from "./automaticActions.js";
import {analyzeDraftSupport, applySupportDecision, evaluateDraftPolicy, scoreDraftConfidence} from "./draftSupport.js";
import {requestApproval} from "./approval.js";
import {approveDraft, rejectDraft, submitDraft} from "./draftApproval.js";
import {sendDraft} from "./draftSending.js";
import {isValidObjectId} from "./draftValidation.js";
import type {CreateDraftData, DraftStatus, UpdateDraftData} from "./draftTypes.js";

const SUPPORT_CATEGORIES = ["general_support", "billing", "technical", "account", "sales", "refund", "cancellation", "shipping", "complaint", "other"] as const;
type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

function normalizeSupportCategory(category: string): SupportCategory {
  return (SUPPORT_CATEGORIES as readonly string[]).includes(category) ? category as SupportCategory : "general_support";
}

function toObjectId(value: string): Types.ObjectId {
  if (!isValidObjectId(value)) throw new Error("Invalid object ID.");
  return new Types.ObjectId(value);
}

function getDraftStatus(action: "auto_approve" | "pending" | "escalate" | "blocked"): DraftStatus {
  if (action === "escalate") return "escalated";
  if (action === "auto_approve") return "approved";
  if (action === "blocked") return "rejected";
  return "pending";
}

export function drafts(userId: string, status?: DraftStatus) {
  return draftRepository.findAll(userId, status);
}

export function draft(id: string) {
  return draftRepository.findById(id);
}

export async function createDraft(data: CreateDraftData) {
  if (!isValidObjectId(data.userId)) throw new Error("Invalid user ID.");
  if (!isValidObjectId(data.emailId)) throw new Error("Invalid source email ID.");
  const tone = data.tone ?? "professional";
  const length = data.length ?? "medium";
  const customer = data.customer.trim();
  if (!customer) throw new Error("Customer information is required.");

  const support = await analyzeDraftSupport(data.userId, data.emailId, customer, tone, length);
  let reply = data.reply?.trim() || support.supportResult.reply.trim();

  if (!reply) {
    reply = await generateReply({
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
  }

  reply = reply.trim();
  if (!reply) throw new Error("AI generated an empty reply.");

  const confidence = await scoreDraftConfidence(data.userId, support.customerEmailBody, reply, support.knowledgeBase);
  const policy = await evaluateDraftPolicy(data.userId, support.customerEmailBody, reply, support.knowledgeBase);
  const automaticAction = applySupportDecision(
    determineAutomaticAction(support.customerEmailBody, confidence, policy),
    support.supportResult,
  );

  const supportCategory = normalizeSupportCategory(support.supportResult.category);
  const policyIssues = [...support.supportResult.policyIssues, ...policy.violations].filter(Boolean);

  const createdDraft = await draftRepository.create({
    userId: toObjectId(data.userId),
    emailId: toObjectId(data.emailId),
    provider: data.provider,
    subject: data.subject.trim(),
    customer,
    reply,
    tone,
    length,
    status: getDraftStatus(automaticAction.action),
    confidence,
    supportCategory,
    supportSentiment: support.supportResult.sentiment,
    supportConfidence: support.supportResult.confidence,
    supportDecision: support.supportResult.decision,
    supportNeedsHuman: support.supportResult.needsHuman,
    supportReason: support.supportResult.reason,
    supportSuggestedActions: support.supportResult.suggestedActions,
    supportMissingInformation: support.supportResult.missingInformation,
    supportPolicyIssues: policyIssues,
    automaticAction: automaticAction.action,
    automaticActionReasons: automaticAction.reasons,
    escalatedAt: automaticAction.action === "escalate" ? new Date() : undefined,
    escalationReason: automaticAction.action === "escalate" ? automaticAction.reasons[0] : undefined,
    escalationReasons: automaticAction.action === "escalate" ? automaticAction.reasons : [],
    approvedAt: automaticAction.action === "auto_approve" ? new Date() : undefined,
    rejectionReason: automaticAction.action === "blocked" ? automaticAction.reasons.join(" ") : undefined,
  });

  await emailRepository.update(data.emailId, {draftId: createdDraft._id});

  if (automaticAction.action === "pending" || automaticAction.action === "escalate") {
    await requestApproval(createdDraft._id.toString(), data.userId);
  }

  return createdDraft;
}

export async function updateDraft(id: string, data: UpdateDraftData) {
  const savedDraft = await draftRepository.findById(id);
  if (!savedDraft) return null;
  if (savedDraft.status === "sent") throw new Error("Sent drafts cannot be edited.");
  if (data.reply === undefined) return draftRepository.update(id, data);

  const userId = savedDraft.userId.toString();
  const emailId = savedDraft.emailId.toString();
  const tone = data.tone ?? savedDraft.tone;
  const length = data.length ?? savedDraft.length;
  const reply = data.reply.trim();

  if (!reply) throw new Error("A reply is required.");

  const support = await analyzeDraftSupport(userId, emailId, savedDraft.customer, tone, length);
  const confidence = await scoreDraftConfidence(userId, support.customerEmailBody, reply, support.knowledgeBase);
  const policy = await evaluateDraftPolicy(userId, support.customerEmailBody, reply, support.knowledgeBase);
  const automaticAction = applySupportDecision(
    determineAutomaticAction(support.customerEmailBody, confidence, policy),
    support.supportResult,
  );

  const supportCategory = normalizeSupportCategory(support.supportResult.category);
  const policyIssues = [...support.supportResult.policyIssues, ...policy.violations].filter(Boolean);

  const updatedDraft = await draftRepository.update(id, {
    ...data,
    reply,
    tone,
    length,
    confidence,
    supportCategory,
    supportSentiment: support.supportResult.sentiment,
    supportConfidence: support.supportResult.confidence,
    supportDecision: support.supportResult.decision,
    supportNeedsHuman: support.supportResult.needsHuman,
    supportReason: support.supportResult.reason,
    supportSuggestedActions: support.supportResult.suggestedActions,
    supportMissingInformation: support.supportResult.missingInformation,
    supportPolicyIssues: policyIssues,
    automaticAction: automaticAction.action,
    automaticActionReasons: automaticAction.reasons,
    status: getDraftStatus(automaticAction.action),
    escalatedAt: automaticAction.action === "escalate" ? new Date() : undefined,
    escalationReason: automaticAction.action === "escalate" ? automaticAction.reasons[0] : undefined,
    escalationReasons: automaticAction.action === "escalate" ? automaticAction.reasons : [],
    approvedAt: automaticAction.action === "auto_approve" ? new Date() : undefined,
    rejectionReason: automaticAction.action === "blocked" ? automaticAction.reasons.join(" ") : undefined,
  });

  if (updatedDraft && (automaticAction.action === "pending" || automaticAction.action === "escalate")) {
    await requestApproval(updatedDraft._id.toString(), userId);
  }

  return updatedDraft;
}

export {approveDraft, rejectDraft, sendDraft, submitDraft};

export function deleteDraft(id: string) {
  return draftRepository.delete(id);
}
