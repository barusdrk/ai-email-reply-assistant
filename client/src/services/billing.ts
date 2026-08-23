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

export interface CheckoutSession {
  id: string;
  url: string;
}

export async function getSubscription(): Promise<Subscription> {
  const { data } =
    await API.get<Subscription>(
      "/billing/subscription"
    );

  return data;
}

export async function changePlan(
  plan: "free"
): Promise<Subscription> {
  const { data } =
    await API.post<Subscription>(
      "/billing/change-plan",
      { plan }
    );

  return data;
}

export async function cancelSubscription(): Promise<Subscription> {
  const { data } =
    await API.post<Subscription>(
      "/billing/cancel"
    );

  return data;
}

export async function createCheckout(
  plan: Exclude<Plan, "free">
): Promise<CheckoutSession> {
  const { data } =
    await API.post<CheckoutSession>(
      "/billing/checkout",
      { plan }
    );

  return data;
}
