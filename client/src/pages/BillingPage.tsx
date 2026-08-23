import {
  useEffect,
  useState,
} from "react";
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
  const [
    subscription,
    setSubscription,
  ] = useState<Subscription | null>(null);
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    checkoutPlan,
    setCheckoutPlan,
  ] = useState<Plan | null>(null);
  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const data =
          await getSubscription();

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

    void load();
  }, []);

  async function handleCheckout(
    plan: "starter" | "pro"
  ) {
    try {
      setCheckoutPlan(plan);
      setError("");

      const session =
        await createCheckout(plan);

      window.location.href =
        session.url;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to start checkout."
      );

      setCheckoutPlan(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6 dark:text-white">
        Loading billing...
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
          Choose the plan that fits your email workflow.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {subscription && (
        <div className="rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Current plan
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-2xl font-bold capitalize dark:text-white">
              {subscription.plan}
            </span>
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
              {subscription.status}
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent =
            subscription?.plan === plan.id;

          const isProcessing =
            checkoutPlan === plan.id;

          return (
            <section
              key={plan.id}
              className="flex flex-col rounded-xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <h2 className="text-xl font-bold dark:text-white">
                {plan.name}
              </h2>

              <div className="mt-4 text-3xl font-bold dark:text-white">
                {plan.price}
              </div>

              <p className="mt-4 text-gray-600 dark:text-gray-400">
                {plan.description}
              </p>

              <div className="mt-6 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p>{plan.replies}</p>
                <p>AI provider: {plan.provider}</p>
              </div>

              <div className="mt-8">
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-lg bg-gray-200 px-4 py-3 font-medium text-gray-500 dark:bg-gray-700"
                  >
                    Current Plan
                  </button>
                ) : plan.id === "free" ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-lg bg-gray-200 px-4 py-3 font-medium text-gray-500 dark:bg-gray-700"
                  >
                    Free Plan
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={Boolean(checkoutPlan)}
                    onClick={() =>
                      void handleCheckout(
                        plan.id as
                          | "starter"
                          | "pro"
                      )
                    }
                    className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isProcessing
                      ? "Redirecting to Stripe..."
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
