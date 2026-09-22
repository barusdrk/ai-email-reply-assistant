import {searchKnowledgeBase} from "./knowledgeBase.js";
import type {SupportPolicy} from "./supportEngine.js";

const POLICY_SEARCH_QUERY = "company support policies refund cancellation escalation allowed restricted actions customer support instructions";
const POLICY_CATEGORIES = {
  refundPolicy: ["refund", "refund policy", "refunds"],
  cancellationPolicy: ["cancellation", "cancellation policy", "cancel"],
  escalationPolicy: ["escalation", "escalation policy", "support escalation"],
  allowedActions: ["allowed actions", "allowed action", "support actions", "permitted actions"],
  restrictedActions: ["restricted actions", "restricted action", "prohibited actions", "forbidden actions"],
  customInstructions: ["support policy", "customer support policy", "support instructions", "custom instructions"],
} as const;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function matchesTitle(title: string, keywords: readonly string[]): boolean {
  const normalizedTitle = title.toLowerCase().trim();
  return keywords.some((keyword) => normalizedTitle === keyword || normalizedTitle.includes(keyword));
}

function splitActions(content: string): string[] {
  return content.split(/\r?\n|;|•|-\s+/).map((item) => item.trim()).filter(Boolean).slice(0, 50);
}

function appendPolicyText(current: string | undefined, content: string): string {
  return current ? `${current}\n${content}` : content;
}

function parseCompanyPolicies(items: Awaited<ReturnType<typeof searchKnowledgeBase>>): SupportPolicy {
  const policies: SupportPolicy = {};
  const allowedActions: string[] = [];
  const restrictedActions: string[] = [];
  const customInstructions: string[] = [];

  for (const item of items ?? []) {
    const title = normalizeText(item.title);
    const content = normalizeText(item.content);
    if (!content) continue;

    if (matchesTitle(title, POLICY_CATEGORIES.refundPolicy)) {
      policies.refundPolicy = appendPolicyText(policies.refundPolicy, content);
      continue;
    }

    if (matchesTitle(title, POLICY_CATEGORIES.cancellationPolicy)) {
      policies.cancellationPolicy = appendPolicyText(policies.cancellationPolicy, content);
      continue;
    }

    if (matchesTitle(title, POLICY_CATEGORIES.escalationPolicy)) {
      policies.escalationPolicy = appendPolicyText(policies.escalationPolicy, content);
      continue;
    }

    if (matchesTitle(title, POLICY_CATEGORIES.allowedActions)) {
      allowedActions.push(...splitActions(content));
      continue;
    }

    if (matchesTitle(title, POLICY_CATEGORIES.restrictedActions)) {
      restrictedActions.push(...splitActions(content));
      continue;
    }

    if (matchesTitle(title, POLICY_CATEGORIES.customInstructions)) {
      customInstructions.push(content);
    }
  }

  if (allowedActions.length > 0) policies.allowedActions = [...new Set(allowedActions)];
  if (restrictedActions.length > 0) policies.restrictedActions = [...new Set(restrictedActions)];
  if (customInstructions.length > 0) policies.customInstructions = [...new Set(customInstructions)].join("\n");

  return policies;
}

export async function getCompanyPolicies(userId: string): Promise<SupportPolicy> {
  const items = await searchKnowledgeBase(userId, POLICY_SEARCH_QUERY);
  return parseCompanyPolicies(items);
}

export async function getCompanyPolicyContext(userId: string): Promise<{companyPolicies: SupportPolicy; policyItems: Awaited<ReturnType<typeof searchKnowledgeBase>>}> {
  const policyItems = await searchKnowledgeBase(userId, POLICY_SEARCH_QUERY);
  return {
    companyPolicies: parseCompanyPolicies(policyItems),
    policyItems,
  };
}
