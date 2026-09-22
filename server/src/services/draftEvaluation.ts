import {analyzeDraftSupport, evaluateDraftPolicy, scoreDraftConfidence} from "./draftSupport.js";
import {determineAutomaticAction, type AutomaticActionResult} from "./automaticActions.js";

export interface DraftEvaluation {
  support: Awaited<ReturnType<typeof analyzeDraftSupport>>;
  confidence: Awaited<ReturnType<typeof scoreDraftConfidence>>;
  policy: Awaited<ReturnType<typeof evaluateDraftPolicy>>;
  automaticAction: AutomaticActionResult;
}

export async function evaluateDraft(userId: string, emailId: string, customerEmail: string, reply: string, tone?: Parameters<typeof analyzeDraftSupport>[3], length?: Parameters<typeof analyzeDraftSupport>[4]): Promise<DraftEvaluation> {
  const trimmedReply = reply.trim();
  if (!trimmedReply) throw new Error("A reply is required.");

  const support = await analyzeDraftSupport(userId, emailId, customerEmail, tone, length);
  const confidence = await scoreDraftConfidence(userId, support.customerEmailBody, trimmedReply, support.knowledgeBase);
  const policy = await evaluateDraftPolicy(userId, support.customerEmailBody, trimmedReply, support.knowledgeBase);
  const automaticAction = determineAutomaticAction(support.customerEmailBody, confidence, policy);

  if (support.supportResult.decision === "reject" || support.supportResult.policyIssues.length > 0) {
    automaticAction.action = "blocked";
    automaticAction.reasons = [
      support.supportResult.reason,
      ...support.supportResult.policyIssues,
    ].filter(Boolean);
  } else if (support.supportResult.decision !== "reply" || support.supportResult.needsHuman) {
    automaticAction.action = "escalate";
    automaticAction.reasons = [
      support.supportResult.reason,
      ...support.supportResult.missingInformation,
      ...support.supportResult.policyIssues,
    ].filter(Boolean);
  }

  if (automaticAction.reasons.length === 0) {
    automaticAction.reasons = ["The AI customer-support engine requires human review."];
  }

  return {support, confidence, policy, automaticAction};
}

export function evaluationStatus(evaluation: DraftEvaluation) {
  switch (evaluation.automaticAction.action) {
    case "auto_approve":
      return "approved" as const;
    case "escalate":
      return "escalated" as const;
    case "blocked":
      return "rejected" as const;
    default:
      return "pending" as const;
  }
}
