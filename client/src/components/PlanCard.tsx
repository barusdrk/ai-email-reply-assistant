import type {
  SubscriptionPlan,
} from "../types/subscription.js";

interface Props {
  plan: SubscriptionPlan;

  currentPlan:
    | SubscriptionPlan
    | null;

  onSelect: (
    plan: SubscriptionPlan
  ) => void;
}

export default function PlanCard({
  plan,
  currentPlan,
  onSelect,
}: Props) {
  const active =
    currentPlan === plan;

  const prices = {
    free: "$0",
    starter: "$9",
    pro: "$29",
  };

  const descriptions = {
    free:
      "Bring your own API key.",
    starter:
      "Higher limits and priority support.",
    pro:
      "Unlimited usage and premium features.",
  };

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">

      <h2 className="text-xl font-semibold capitalize">
        {plan}
      </h2>

      <p className="mt-2 text-3xl font-bold">
        {prices[plan]}
        <span className="text-base font-normal">
          /month
        </span>
      </p>

      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        {descriptions[plan]}
      </p>

      <button
        type="button"
        disabled={active}
        onClick={() =>
          onSelect(plan)
        }
        className={
          active
            ? "mt-6 w-full rounded-lg bg-gray-400 px-4 py-2 text-white"
            : "mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        }
      >
        {active
          ? "Current Plan"
          : "Choose Plan"}
      </button>

    </div>
  );
}
