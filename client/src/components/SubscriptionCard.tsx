import type { Subscription } from "../types/subscription.js";

interface Props {
  subscription: Subscription;
  onCancel?: () => void;
}

export default function SubscriptionCard({ subscription, onCancel }: Props) {
  return (
    <div className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-(--text-h)">Subscription</h2>

      <div className="mt-6 space-y-3">
        <div className="flex justify-between text-(--text)">
          <span>Plan</span>
          <span className="font-medium capitalize">{subscription.plan}</span>
        </div>

        <div className="flex justify-between text-(--text)">
          <span>Status</span>
          <span className="font-medium capitalize">{subscription.status}</span>
        </div>

        <div className="flex justify-between text-(--text)">
          <span>Provider</span>
          <span className="font-medium capitalize">{subscription.provider}</span>
        </div>

        {subscription.currentPeriodEnd && (
          <div className="flex justify-between text-(--text)">
            <span>Renews</span>
            <span>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {subscription.plan !== "free" && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-6 w-full rounded-lg bg-(--danger-text) px-4 py-2 text-(--accent-contrast) hover:opacity-90"
        >
          Cancel Subscription
        </button>
      )}
    </div>
  );
}
