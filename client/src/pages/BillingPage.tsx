import {
  useEffect,
  useState,
} from "react";

import API from "../services/api.js";

interface Subscription {
  plan:
    | "free"
    | "starter"
    | "pro";

  status: string;
}

export default function BillingPage() {
  const [subscription, setSubscription] =
    useState<Subscription | null>(
      null
    );

  useEffect(() => {
    async function load() {
      const { data } =
        await API.get(
          "/billing"
        );

      setSubscription(
        data
      );
    }

    load();
  }, []);

  async function upgrade(
    plan: "starter" | "pro"
  ) {
    await API.post(
      "/billing/upgrade",
      {
        plan,
      }
    );

    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Billing
      </h1>

      <div className="rounded-lg border p-6">
        <p>
          Current plan:
          {" "}
          <strong>
            {subscription?.plan ?? "free"}
          </strong>
        </p>

        <p>
          Status:
          {" "}
          {subscription?.status ?? "active"}
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() =>
              upgrade("starter")
            }
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            Starter
          </button>

          <button
            onClick={() =>
              upgrade("pro")
            }
            className="rounded bg-purple-600 px-4 py-2 text-white"
          >
            Pro
          </button>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Payments can be connected later
          with Stripe.
        </p>
      </div>
    </div>
  );
}
