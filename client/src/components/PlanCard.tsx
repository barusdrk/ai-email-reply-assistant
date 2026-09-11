import type { SubscriptionPlan } from "../types/subscription.js";

interface Props {
  plan: SubscriptionPlan;
  currentPlan: SubscriptionPlan | null;
  onSelect: (plan: SubscriptionPlan) => void;
}

export default function PlanCard({ plan, currentPlan, onSelect }: Props) {
  const active = currentPlan === plan;
  const prices = { free: "$0", starter: "$9", pro: "$29" };
  const descriptions = {
    free: "Bring your own API key.",
    starter: "Higher limits and priority support.",
    pro: "Unlimited usage and premium features.",
  };

  return (
    <div className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
      <h2 className="text-xl font-semibold capitalize text-(--text-h)">{plan}</h2>
      <p className="mt-2 text-3xl font-bold text-(--text)">
        {prices[plan]}
        <span className="text-base font-normal text-(--text-secondary)">/month</span>
      </p>
      <p className="mt-4 text-sm text-(--text-secondary)">{descriptions[plan]}</p>
      <button
        type="button"
        disabled={active}
        onClick={() => onSelect(plan)}
        className={`mt-6 w-full rounded-lg px-4 py-2 font-medium transition ${
          active
            ? "cursor-not-allowed bg-(--bg-secondary) text-(--text-secondary)"
            : "bg-(--accent) text-(--accent-contrast) hover:opacity-90"
        }`}
      >
        {active ? "Current Plan" : "Choose Plan"}
      </button>
    </div>
  );
}
