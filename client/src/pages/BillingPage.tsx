import { useEffect, useState } from "react";
import {
  cancelSubscription,
  changePlan,
  createCheckout,
  getSubscription,
  requestBusinessSales,
  type Plan,
  type Subscription,
} from "../services/billing.js";

const plans: {
  id: Plan;
  name: string;
  price: string;
  replies: string;
  description: string;
  features: string[];
}[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    replies: "100 replies / month",
    description: "Try AI-powered customer support automation.",
    features: [
      "100 AI replies per month",
      "Choose from OpenAI, Gemini, Groq, or Claude",
      "Manual draft generation",
      "Approval workflow",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "$19/month",
    replies: "1,000 replies / month",
    description: "For small teams automating everyday support.",
    features: [
      "1,000 AI replies per month",
      "Choose from OpenAI, Gemini, Groq, or Claude",
      "Auto drafts",
      "Gmail and Outlook integrations",
      "Approval workflow",
      "Conversation memory",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$59/month",
    replies: "10,000 replies / month",
    description: "For growing support teams with advanced automation.",
    features: [
      "10,000 AI replies per month",
      "Choose from OpenAI, Gemini, Groq, or Claude",
      "Automatic support handling",
      "Priority processing",
      "Advanced escalation workflows",
      "CRM and customer context",
      "Advanced analytics",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "$149+",
    replies: "Custom support volume",
    description: "For organizations with complex support operations.",
    features: [
      "Custom support volume",
      "Multiple support inboxes",
      "CRM and customer context",
      "Conversation memory",
      "Advanced escalation workflows",
      "Custom policies and automation",
      "Business-level analytics",
      "Dedicated support",
    ],
  },
];

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const [businessRequested, setBusinessRequested] = useState(false);

  useEffect(() => {
    async function loadSubscription() {
      try {
        setLoading(true);
        setError("");
        const data = await getSubscription();
        setSubscription(data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load billing information."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadSubscription();
  }, []);

  async function handleChangePlan(plan: Plan) {
    if (subscription?.plan === plan) return;

    try {
      setChangingPlan(plan);
      setError("");

      if (plan === "free") {
        const updated = await changePlan("free");
        setSubscription(updated);
        return;
      }

      if (plan === "business") {
        await requestBusinessSales();
        setBusinessRequested(true);
        return;
      }

      const checkout = await createCheckout(plan);
      window.location.href = checkout.url;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update plan."
      );
    } finally {
      setChangingPlan(null);
    }
  }

  async function handleCancel() {
    try {
      setChangingPlan(subscription?.plan ?? "free");
      setError("");

      const updated = await cancelSubscription();
      setSubscription(updated);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to cancel subscription."
      );
    } finally {
      setChangingPlan(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-(--text)">
        Loading billing information...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-(--text-h)">Billing</h1>
        <p className="mt-2 text-(--text-secondary)">
          Choose the plan that fits your customer support operation.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-(--danger-bg) bg-(--danger-bg) p-4 text-(--danger-text)">
          {error}
        </div>
      )}

      {businessRequested && (
        <div className="rounded-lg border border-(--accent) bg-(--accent-light) p-4 text-(--accent)">
          Your Business sales request has been received. We will contact you to discuss your requirements and pricing.
        </div>
      )}

      <div className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
        <p className="text-sm text-(--text-secondary)">Current plan</p>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold capitalize text-(--text-h)">
            {subscription?.plan ?? "free"}
          </h2>

          <span className="rounded-full bg-(--info-bg) px-3 py-1 text-sm font-medium text-(--info-text)">
            {subscription?.status ?? "active"}
          </span>
        </div>

        {subscription?.plan !== "free" && (
          <button
            type="button"
            onClick={() => void handleCancel()}
            disabled={changingPlan !== null}
            className="mt-5 rounded-lg border border-(--danger-text) px-4 py-2 text-(--danger-text) hover:bg-(--danger-bg) disabled:cursor-not-allowed disabled:opacity-50"
          >
            {changingPlan ? "Updating..." : "Cancel Subscription"}
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = subscription?.plan === plan.id;
          const isProcessing = changingPlan === plan.id;

          return (
            <section
              key={plan.id}
              className="flex flex-col rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm"
            >
              <h2 className="text-xl font-bold text-(--text-h)">
                {plan.name}
              </h2>

              <div className="mt-4 text-3xl font-bold text-(--text-h)">
                {plan.price}
              </div>

              <p className="mt-4 text-(--text-secondary)">
                {plan.description}
              </p>

              <div className="mt-6 space-y-3 text-sm text-(--text-secondary)">
                <p className="font-medium text-(--text-h)">{plan.replies}</p>

                {plan.features.map((feature) => (
                  <p key={feature} className="flex gap-2">
                    <span className="text-(--accent)">✓</span>
                    <span>{feature}</span>
                  </p>
                ))}
              </div>

              <div className="mt-8">
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-lg bg-(--bg-secondary) px-4 py-3 font-medium text-(--text-secondary)"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={changingPlan !== null}
                    onClick={() => void handleChangePlan(plan.id)}
                    className="w-full rounded-lg bg-(--accent) px-4 py-3 font-medium text-(--accent-contrast) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isProcessing
                      ? plan.id === "business"
                        ? "Requesting..."
                        : plan.id === "free"
                          ? "Updating..."
                          : "Redirecting to Stripe..."
                      : plan.id === "business"
                        ? "Contact Sales"
                        : `Choose ${plan.name}`}
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
