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
  const [
    subscription,
    setSubscription,
  ] = useState<Subscription | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data } =
          await API.get(
            "/billing"
          );

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

    load();
  }, []);

  async function upgrade(
    plan: "starter" | "pro"
  ) {
    try {
      await API.post(
        "/billing/upgrade",
        {
          plan,
        }
      );

      const { data } =
        await API.get(
          "/billing"
        );

      setSubscription(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to upgrade plan."
      );
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        Loading billing...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Billing
      </h1>

      <div className="rounded-lg border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p>
          Current plan:{" "}
          <strong>
            {subscription?.plan ?? "free"}
          </strong>
        </p>

        <p className="mt-2">
          Status:{" "}
          {subscription?.status ?? "active"}
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() =>
              upgrade("starter")
            }
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Upgrade to Starter
          </button>

          <button
            onClick={() =>
              upgrade("pro")
            }
            className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
          >
            Upgrade to Pro
          </button>
        </div>

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Stripe integration can be connected later.
        </p>
      </div>
    </div>
  );
}
