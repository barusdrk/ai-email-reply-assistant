import { Types } from "mongoose";
import { draftRepository } from "../repositories/DraftRepository.js";
import EmailModel from "../models/Email.js";
import { generateReply } from "./openai.js";
import { sendEmail } from "./sendEmail.js";
import { searchKnowledgeBase } from "./knowledgeBase.js";
import { scoreReplyConfidence } from "./confidenceScoring.js";
import { checkReplyPolicy, type PolicyCheckResult } from "./policyChecker.js";
import { determineEscalation } from "./escalation.js";
import { getConversationHistory } from "./conversationMemory.js";
import { determineAutomaticAction } from "./automaticActions.js";

export type DraftTone = "professional" | "friendly" | "formal" | "concise" | "empathetic" | "enthusiastic";
export type DraftLength = "short" | "medium" | "long";
export type DraftStatus = "pending" | "approved" | "rejected" | "sent" | "escalated";
export type Provider = "gmail" | "outlook" | "sample";

interface CreateDraftData {
  userId: string;
  emailId: string;
  provider: Provider;
  subject: string;
  customer: string;
  email?: string;
  reply?: string;
  tone?: DraftTone;
  length?: DraftLength;
}

interface UpdateDraftData {
  reply?: string;
  tone?: DraftTone;
  length?: DraftLength;
  status?: DraftStatus;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value);
}

async function getSourceEmail(userId: string, emailId: string) {
  if (!isValidObjectId(userId)) throw new Error("Invalid user ID.");
  if (!isValidObjectId(emailId)) throw new Error("Invalid source email ID.");

  const sourceEmail = await EmailModel.findOne({
    _id: new Types.ObjectId(emailId),
    userId: new Types.ObjectId(userId),
  }).lean();

  if (!sourceEmail) throw new Error("Source email not found.");
  return sourceEmail;
}

async function evaluateDraftPolicy(
  userId: string,
  email: string,
  reply: string,
  knowledgeBase?: Awaited<ReturnType<typeof searchKnowledgeBase>>
): Promise<PolicyCheckResult> {
  const customerEmail = email.trim();
  const draftReply = reply.trim();

  if (!customerEmail) {
    throw new Error("The original customer email has no body, so the reply cannot be policy checked.");
  }

  if (!draftReply) {
    throw new Error("A reply is required.");
  }

  const context =
    knowledgeBase ??
    await searchKnowledgeBase(userId, customerEmail);

  return checkReplyPolicy({
    email: customerEmail,
    reply: draftReply,
    knowledgeBase: context ?? [],
  });
}

async function scoreDraftConfidence(
  userId: string,
  email: string,
  reply: string,
  knowledgeBase?: Awaited<ReturnType<typeof searchKnowledgeBase>>
) {
  const customerEmail = email.trim();
  const draftReply = reply.trim();

  if (!customerEmail) throw new Error("The original customer email has no body, so the draft cannot be scored.");
  if (!draftReply) throw new Error("A reply is required.");

  const context = knowledgeBase ?? await searchKnowledgeBase(userId, customerEmail);

  return scoreReplyConfidence({
    email: customerEmail,
    reply: draftReply,
    knowledgeBase: context ?? [],
  });
}

export function drafts(userId: string, status?: DraftStatus) {
  return draftRepository.findAll(userId, status);
}

export function draft(id: string) {
  return draftRepository.findById(id);
}

export async function createDraft(data: CreateDraftData) {
  const tone = data.tone ?? "professional";
  const length = data.length ?? "medium";
  const sourceEmail = await getSourceEmail(data.userId, data.emailId);
  const customerEmailBody = sourceEmail.body?.trim() || data.email?.trim() || "";

  if (!customerEmailBody) {
    throw new Error("The original customer email has no body, so the draft cannot be scored.");
  }

  const conversationHistory = sourceEmail.threadId
    ? await getConversationHistory(data.userId, sourceEmail.threadId, data.emailId)
    : [];

  const knowledgeBase = await searchKnowledgeBase(
    data.userId,
    customerEmailBody
  );

  const reply = data.reply?.trim()
    ? data.reply.trim()
    : await generateReply({
        userId: data.userId,
        email: customerEmailBody,
        tone,
        length,
        knowledgeBase: knowledgeBase ?? [],
        conversationHistory: conversationHistory.map((message) => ({
          role: message.role,
          subject: message.subject,
          content: message.content,
          timestamp: message.timestamp
            ? message.timestamp.toISOString()
            : "unknown",
        })),
      });

  if (!reply.trim()) throw new Error("AI generated an empty reply.");

  const confidence = await scoreDraftConfidence(
    data.userId,
    customerEmailBody,
    reply,
    knowledgeBase
  );

  console.log("Draft confidence:", {
    score: confidence.score,
    level: confidence.level,
  });

  const policy = await evaluateDraftPolicy(
    data.userId,
    customerEmailBody,
    reply,
    knowledgeBase
  );

  const automaticAction = determineAutomaticAction(
    customerEmailBody,
    confidence,
    policy
  );

  console.log("Automatic action:", {
    action: automaticAction.action,
    reasons: automaticAction.reasons,
  });

  return draftRepository.create({
    userId: data.userId as any,
    emailId: data.emailId as any,
    provider: data.provider,
    subject: data.subject,
    customer: data.customer.trim(),
    reply,
    tone,
    length,
    status:
      automaticAction.action === "escalate"
        ? "escalated"
        : automaticAction.action === "auto_approve"
          ? "approved"
          : automaticAction.action === "blocked"
            ? "rejected"
            : "pending",
    confidence,
    automaticAction: automaticAction.action,
    automaticActionReasons: automaticAction.reasons,
    escalatedAt:
      automaticAction.action === "escalate"
        ? new Date()
        : undefined,
    escalationReason:
      automaticAction.action === "escalate"
        ? automaticAction.reasons[0]
        : undefined,
    escalationReasons:
      automaticAction.action === "escalate"
        ? automaticAction.reasons
        : [],
    approvedAt:
      automaticAction.action === "auto_approve"
        ? new Date()
        : undefined,
    rejectionReason:
      automaticAction.action === "blocked"
        ? automaticAction.reasons.join(" ")
        : undefined,
  });
}

export async function updateDraft(id: string, data: UpdateDraftData) {
  const savedDraft = await draftRepository.findById(id);
  if (!savedDraft) return null;
  if (savedDraft.status === "sent") throw new Error("Sent drafts cannot be edited.");

  const update: UpdateDraftData & {
    confidence?: Awaited<ReturnType<typeof scoreDraftConfidence>>;
    escalatedAt?: Date;
    escalationReason?: string;
    escalationReasons?: string[];
  } = { ...data };

  if (data.reply !== undefined) {
    const sourceEmail = await getSourceEmail(
      savedDraft.userId.toString(),
      savedDraft.emailId.toString()
    );
    const customerEmailBody = sourceEmail.body?.trim() || "";

    update.confidence = await scoreDraftConfidence(
      savedDraft.userId.toString(),
      customerEmailBody,
      data.reply
    );

    const escalation = determineEscalation(
      customerEmailBody,
      update.confidence
    );

    update.status = escalation.escalated ? "escalated" : "pending";
    update.escalatedAt = escalation.escalated ? new Date() : undefined;
    update.escalationReason = escalation.escalated
      ? escalation.reasons[0]
      : undefined;
    update.escalationReasons = escalation.reasons;

    console.log("Updated draft confidence:", {
      score: update.confidence.score,
      level: update.confidence.level,
    });

    if (escalation.escalated) {
      console.log("Draft automatically escalated after edit:", escalation.reasons);
    }
  }

  return draftRepository.update(id, update);
}

export async function approveDraft(id: string, userId: string) {
  const savedDraft = await draftRepository.findById(id);
  if (!savedDraft) return null;
  if (savedDraft.userId.toString() !== userId) throw new Error("Unauthorized.");

  if (savedDraft.status === "escalated") {
    throw new Error("This draft requires human review before it can be approved.");
  }

  if (savedDraft.status !== "pending") {
    throw new Error("Only pending drafts can be approved.");
  }

  const sourceEmail = await getSourceEmail(
    userId,
    savedDraft.emailId.toString()
  );

  await evaluateDraftPolicy(
    userId,
    sourceEmail.body ?? "",
    savedDraft.reply ?? ""
  ).then((result) => {
    if (!result.compliant || result.violations.length > 0) {
      const details = result.violations.length
        ? result.violations.join(" ")
        : "The reply is not compliant.";

      throw new Error(`Policy check failed: ${details}`);
    }
  });

  return draftRepository.update(id, {
    status: "approved",
    approvedAt: new Date(),
    rejectionReason: undefined,
  });
}

export async function rejectDraft(id: string, userId: string, reason?: string) {
  const savedDraft = await draftRepository.findById(id);
  if (!savedDraft) return null;
  if (savedDraft.userId.toString() !== userId) throw new Error("Unauthorized.");
  if (savedDraft.status === "sent") throw new Error("Sent drafts cannot be rejected.");
  if (savedDraft.status === "rejected") throw new Error("Draft is already rejected.");

  const rejectionReason = reason?.trim();

  return draftRepository.update(id, {
    status: "rejected",
    rejectionReason: rejectionReason || undefined,
  });
}

export async function sendDraft(id: string, userId: string) {
  const savedDraft = await draftRepository.findById(id);
  if (!savedDraft) throw new Error("Draft not found.");
  if (savedDraft.userId.toString() !== userId) throw new Error("Unauthorized.");
  if (savedDraft.status !== "approved") throw new Error("Only approved drafts can be sent.");

  const customer = savedDraft.customer?.trim() ?? "";
  const subject = savedDraft.subject?.trim() ?? "";
  const reply = savedDraft.reply?.trim() ?? "";

  if (!customer || !isValidEmail(customer)) throw new Error("A valid recipient email is required.");
  if (!subject) throw new Error("A subject is required.");
  if (!reply) throw new Error("A reply is required.");

  const sourceEmail = await getSourceEmail(
    userId,
    savedDraft.emailId.toString()
  );

  await evaluateDraftPolicy(
    userId,
    sourceEmail.body ?? "",
    savedDraft.reply ?? ""
  ).then((result) => {
    if (!result.compliant || result.violations.length > 0) {
      const details = result.violations.length
        ? result.violations.join(" ")
        : "The reply is not compliant.";

      throw new Error(`Policy check failed: ${details}`);
    }
  });

  await sendEmail({
    userId,
    provider: savedDraft.provider,
    to: customer,
    subject,
    reply,
    threadId: sourceEmail.threadId ?? undefined,
    inReplyTo: savedDraft.provider === "gmail"
      ? sourceEmail.messageIdHeader || undefined
      : undefined,
    references: savedDraft.provider === "gmail"
      ? sourceEmail.references ?? []
      : undefined,
    originalMessageId: savedDraft.provider === "outlook"
      ? sourceEmail.messageId
      : undefined,
  });

  return draftRepository.update(id, {
    status: "sent",
    sentAt: new Date(),
  });
}

export function deleteDraft(id: string) {
  return draftRepository.delete(id);
}

export async function submitDraft(id: string, userId: string) {
  const savedDraft = await draftRepository.findById(id);
  if (!savedDraft) return null;
  if (savedDraft.userId.toString() !== userId) throw new Error("Unauthorized.");
  if (savedDraft.status === "sent") throw new Error("Sent drafts cannot be submitted.");

  return draftRepository.update(id, {
    status: "pending",
    rejectionReason: undefined,
    escalatedAt: undefined,
    escalationReason: undefined,
    escalationReasons: [],
  });
}
