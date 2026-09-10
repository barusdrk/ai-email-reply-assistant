import { useEffect, useState } from "react";
import {
  createCheckout,
  getSubscription,
  type Plan,
  type Subscription,
} from "../services/billing.js";

const plans: {
  id: Plan;
  name: string;
  price: string;
  replies: string;
  provider: string;
  description: string;
}[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    replies: "100 replies/month",
    provider: "Gemini",
    description: "For trying the AI Email Reply Assistant.",
  },
  {
    id: "starter",
    name: "Starter",
    price: "$9/month",
    replies: "1,000 replies/month",
    provider: "Gemini",
    description: "For regular email workflows.",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29/month",
    replies: "10,000 replies/month",
    provider: "OpenAI",
    description: "For high-volume professional use.",
  },
];

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await getSubscription();
        setSubscription(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to load billing information.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleCheckout(plan: "starter" | "pro") {
    try {
      setCheckoutPlan(plan);
      setError("");
      const session = await createCheckout(plan);
      window.location.href = session.url;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to start checkout.");
      setCheckoutPlan(null);
    }
  }

  if (loading) {
    return <div className="p-6 text-(--text)">Loading billing...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-(--text-h)">Billing</h1>
        <p className="mt-2 text-(--text-secondary)">Choose the plan that fits your email workflow.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-(--border) bg-(--danger-bg) p-4 text-(--danger-text)">
          {error}
        </div>
      )}

      {subscription && (
        <div className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
          <p className="text-sm text-(--text-secondary)">Current plan</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-2xl font-bold capitalize text-(--text-h)">{subscription.plan}</span>
            <span className="rounded-full bg-(--info-bg) px-3 py-1 text-sm font-medium text-(--info-text)">{subscription.status}</span>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = subscription?.plan === plan.id;
          const isProcessing = checkoutPlan === plan.id;

          return (
            <section key={plan.id} className="flex flex-col rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
              <h2 className="text-xl font-bold text-(--text-h)">{plan.name}</h2>

              <div className="mt-4 text-3xl font-bold text-(--text-h)">{plan.price}</div>

              <p className="mt-4 text-(--text-secondary)">{plan.description}</p>

              <div className="mt-6 space-y-2 text-sm text-(--text-secondary)">
                <p>{plan.replies}</p>
                <p>AI provider: {plan.provider}</p>
              </div>

              <div className="mt-8">
                {isCurrent ? (
                  <button type="button" disabled className="w-full rounded-lg bg-(--bg-secondary) px-4 py-3 font-medium text-(--text-secondary)">
                    Current Plan
                  </button>
                ) : plan.id === "free" ? (
                  <button type="button" disabled className="w-full rounded-lg bg-(--bg-secondary) px-4 py-3 font-medium text-(--text-secondary)">
                    Free Plan
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={Boolean(checkoutPlan)}
                    onClick={() => void handleCheckout(plan.id as "starter" | "pro")}
                    className="w-full rounded-lg bg-(--accent) px-4 py-3 font-medium text-(--accent-contrast) transition hover:bg-(--accent-hover) disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isProcessing ? "Redirecting to Stripe..." : `Choose ${plan.name}`}
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
