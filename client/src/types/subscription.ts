export type SubscriptionPlan =
  | "free"
  | "starter"
  | "pro";

export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "expired";

export type BillingProvider =
  | "none"
  | "stripe";

export interface Subscription {
  id: string;

  userId: string;

  plan: SubscriptionPlan;

  status: SubscriptionStatus;

  provider: BillingProvider;

  customerId?: string;

  subscriptionId?: string;

  currentPeriodStart?: string;

  currentPeriodEnd?: string;

  createdAt: string;

  updatedAt: string;
}
