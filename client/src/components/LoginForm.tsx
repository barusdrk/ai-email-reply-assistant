import { FormEvent, useState } from "react";

interface LoginFormProps {
  onSubmit: (
    email: string,
    password: string
  ) => Promise<void>;

  loading?: boolean;

  error?: string;
}

export default function LoginForm({
  onSubmit,
  loading = false,
  error,
}: LoginFormProps) {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    await onSubmit(email, password);
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
      <h1 className="mb-2 text-center text-3xl font-bold text-gray-900 dark:text-white">
        AI Email Reply Assistant
      </h1>

      <p className="mb-8 text-center text-gray-600 dark:text-gray-300">
        Sign in to continue
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Email Address
          </label>

          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            disabled={loading}
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            className="
              w-full
              rounded-lg
              border
              border-gray-300
              bg-white
              px-4
              py-3
              text-gray-900
              outline-none
              transition
              focus:border-blue-500
              focus:ring-2
              focus:ring-blue-500
              disabled:bg-gray-100
              dark:border-gray-700
              dark:bg-gray-900
              dark:text-white
            "
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={loading}
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            className="
              w-full
              rounded-lg
              border
              border-gray-300
              bg-white
              px-4
              py-3
              text-gray-900
              outline-none
              transition
              focus:border-blue-500
              focus:ring-2
              focus:ring-blue-500
              disabled:bg-gray-100
              dark:border-gray-700
              dark:bg-gray-900
              dark:text-white
            "
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="
            w-full
            rounded-lg
            bg-blue-600
            px-4
            py-3
            font-semibold
            text-white
            transition
            hover:bg-blue-700
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          {loading
            ? "Signing In..."
            : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Demo account:
        <br />
        demo@example.com
        <br />
        password123
      </p>
    </div>
  );
}
