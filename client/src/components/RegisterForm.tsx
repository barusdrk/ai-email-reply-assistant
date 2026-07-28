import { FormEvent, useState } from "react";

interface RegisterFormProps {
  onSubmit: (
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<void>;

  loading?: boolean;

  error?: string;
}

export default function RegisterForm({
  onSubmit,
  loading = false,
  error,
}: RegisterFormProps) {
  const [email, setEmail] = useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    await onSubmit(
      email,
      password,
      confirmPassword
    );
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl bg-white p-8 shadow-lg dark:bg-gray-800">
      <h1 className="mb-2 text-center text-3xl font-bold text-gray-900 dark:text-white">
        Create Account
      </h1>

      <p className="mb-8 text-center text-gray-600 dark:text-gray-300">
        Register to use the AI Email Reply Assistant
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="register-email"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Email
          </label>

          <input
            id="register-email"
            type="email"
            required
            autoComplete="email"
            disabled={loading}
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="register-password"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Password
          </label>

          <input
            id="register-password"
            type="password"
            required
            autoComplete="new-password"
            disabled={loading}
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Confirm Password
          </label>

          <input
            id="confirm-password"
            type="password"
            required
            autoComplete="new-password"
            disabled={loading}
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(
                e.target.value
              )
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
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
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading
            ? "Creating Account..."
            : "Create Account"}
        </button>
      </form>
    </div>
  );
}
