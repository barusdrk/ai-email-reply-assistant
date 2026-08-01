import API from "./api.js";

export type Plan =
  | "free"
  | "starter"
  | "pro";

export interface Subscription {
  id: string;

  plan: Plan;

  status:
    | "active"
    | "cancelled"
    | "expired";

  provider:
    | "none"
    | "stripe";

  currentPeriodStart?: string;

  currentPeriodEnd?: string;
}

export async function getSubscription() {
  const { data } =
    await API.get<Subscription>(
      "/billing"
    );

  return data;
}

export async function changePlan(
  plan: Plan
) {
  const { data } =
    await API.post<Subscription>(
      "/billing/change-plan",
      {
        plan,
      }
    );

  return data;
}

export async function cancelSubscription() {
  const { data } =
    await API.post<Subscription>(
      "/billing/cancel"
    );

  return data;
}
