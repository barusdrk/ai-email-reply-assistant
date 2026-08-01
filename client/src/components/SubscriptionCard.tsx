import type {
  Subscription,
} from "../types/subscription.js";

interface Props {
  subscription: Subscription;

  onCancel?: () => void;
}

export default function SubscriptionCard({
  subscription,
  onCancel,
}: Props) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">

      <h2 className="text-xl font-semibold">
        Subscription
      </h2>

      <div className="mt-6 space-y-3">

        <div className="flex justify-between">
          <span>Plan</span>
          <span className="font-medium capitalize">
            {subscription.plan}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Status</span>
          <span className="font-medium capitalize">
            {subscription.status}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Provider</span>
          <span className="font-medium capitalize">
            {subscription.provider}
          </span>
        </div>

        {subscription.currentPeriodEnd && (
          <div className="flex justify-between">
            <span>Renews</span>
            <span>
              {new Date(
                subscription.currentPeriodEnd
              ).toLocaleDateString()}
            </span>
          </div>
        )}

      </div>

      {subscription.plan !== "free" &&
        onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-6 w-full rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Cancel Subscription
          </button>
        )}

    </div>
  );
}
