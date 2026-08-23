import { useEffect, useState } from "react";
import {
  cancelSubscription,
  changePlan,
  createCheckout,
  getSubscription,
  type Plan,
  type Subscription,
} from "../services/billing.js";

const aiProviders = [
  "OpenAI",
  "Gemini",
  "Groq",
  "Claude",
];

const plans: {
  id: Plan;
  name: string;
  price: string;
  replies: string;
  features: string[];
}[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    replies: "100 replies / month",
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
    price: "$9",
    replies: "1,000 replies / month",
    features: [
      "1,000 AI replies per month",
      "Choose from OpenAI, Gemini, Groq, or Claude",
      "Auto drafts",
      "Email integrations",
      "Approval workflow",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    replies: "10,000 replies / month",
    features: [
      "10,000 AI replies per month",
      "Choose from OpenAI, Gemini, Groq, or Claude",
      "Auto drafts",
      "Priority processing",
      "Advanced workflow features",
    ],
  },
];

export default function Billing() {
  const [subscription, setSubscription] =
    useState<Subscription | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [changingPlan, setChangingPlan] =
    useState<Plan | null>(null);
  const [error, setError] =
    useState("");

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

  async function handleChangePlan(
    plan: Plan
  ) {
    if (subscription?.plan === plan) {
      return;
    }

    try {
      setChangingPlan(plan);
      setError("");

      if (plan === "free") {
        const updated =
          await changePlan("free");

        setSubscription(updated);
        return;
      }

      const checkout =
        await createCheckout(plan);

      window.location.href =
        checkout.url;
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
      <div className="p-6 dark:text-white">
        Loading billing information...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold dark:text-white">
          Billing
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Choose the plan that fits your AI email workflow.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Current plan
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold capitalize dark:text-white">
            {subscription?.plan ?? "free"}
          </h2>

          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
            {subscription?.status ?? "active"}
          </span>
        </div>

        {subscription?.plan !== "free" && (
          <button
            type="button"
            onClick={() => {
              void handleCancel();
            }}
            disabled={changingPlan !== null}
            className="mt-5 rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-950"
          >
            {changingPlan
              ? "Updating..."
              : "Cancel Subscription"}
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const current =
            subscription?.plan === plan.id;
          const processing =
            changingPlan === plan.id;

          return (
            <section
              key={plan.id}
              className={`rounded-xl border p-6 shadow-sm dark:bg-gray-800 ${
                current
                  ? "border-blue-600 ring-2 ring-blue-100 dark:border-blue-500 dark:ring-blue-900"
                  : "bg-white dark:border-gray-700"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold dark:text-white">
                    {plan.name}
                  </h2>

                  <p className="mt-2 text-3xl font-bold dark:text-white">
                    {plan.price}
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      {plan.id === "free"
                        ? ""
                        : " / month"}
                    </span>
                  </p>
                </div>

                {current && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    Current Plan
                  </span>
                )}
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <p className="font-medium dark:text-white">
                  {plan.replies}
                </p>

                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-200">
                    Available AI providers
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {aiProviders.map((provider) => (
                      <span
                        key={provider}
                        className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      >
                        {provider}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-2 text-sm text-gray-600 dark:text-gray-300"
                  >
                    <span className="font-bold text-green-600">
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => {
                  void handleChangePlan(plan.id);
                }}
                disabled={
                  current ||
                  changingPlan !== null
                }
                className={`mt-8 w-full rounded-lg px-4 py-3 font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                  current
                    ? "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    : plan.id === "pro"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                }`}
              >
                {processing
                  ? "Updating..."
                  : current
                    ? "Current Plan"
                    : plan.id === "free"
                      ? "Downgrade to Free"
                      : `Choose ${plan.name}`}
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
