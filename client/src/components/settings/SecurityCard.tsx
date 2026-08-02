import { useState } from "react";

interface Props {
  onChangePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
}

export default function SecurityCard({
  onChangePassword,
}: Props) {
  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);

    try {
      await onChangePassword(
        currentPassword,
        newPassword
      );

      setCurrentPassword("");
      setNewPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-4 text-lg font-semibold dark:text-white">
        Security
      </h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) =>
            setCurrentPassword(
              e.target.value
            )
          }
          className="w-full rounded-md border px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />

        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) =>
            setNewPassword(
              e.target.value
            )
          }
          className="w-full rounded-md border px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading
            ? "Saving..."
            : "Change Password"}
        </button>
      </form>
    </section>
  );
}
