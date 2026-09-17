import {draftRepository} from "../repositories/DraftRepository.js";
import {analyzeDraftSupport, evaluateDraftPolicy} from "./draftSupport.js";

export async function approveDraft(id: string, userId: string) {
  const savedDraft = await draftRepository.findById(id);
  if (!savedDraft) return null;
  if (savedDraft.userId.toString() !== userId) throw new Error("Unauthorized.");
  if (savedDraft.status === "escalated") throw new Error("This draft requires human review before it can be approved.");
  if (savedDraft.status !== "pending") throw new Error("Only pending drafts can be approved.");

  const support = await analyzeDraftSupport(
    userId,
    savedDraft.emailId.toString(),
    savedDraft.customer,
    savedDraft.tone,
    savedDraft.length,
  );

  if (support.supportResult.decision !== "reply" || support.supportResult.needsHuman || support.supportResult.policyIssues.length > 0) {
    throw new Error(`AI support review requires human review: ${support.supportResult.reason}`);
  }

  const policy = await evaluateDraftPolicy(
    userId,
    support.customerEmailBody,
    savedDraft.reply ?? "",
    support.knowledgeBase,
  );

  if (!policy.compliant || policy.violations.length > 0) {
    const details = policy.violations.length ? policy.violations.join(" ") : "The reply is not compliant.";
    throw new Error(`Policy check failed: ${details}`);
  }

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

  return draftRepository.update(id, {
    status: "rejected",
    rejectionReason: reason?.trim() || undefined,
  });
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
