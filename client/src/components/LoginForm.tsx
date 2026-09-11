import { type FormEvent, useState } from "react";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  loading?: boolean;
  error?: string;
}

export default function LoginForm({ onSubmit, loading = false, error }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(email, password);
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl bg-(--surface) p-8 shadow-lg">
      <h1 className="mb-2 text-center text-3xl font-bold text-(--text-h)">
        AI Email Reply Assistant
      </h1>
      <p className="mb-8 text-center text-(--text-secondary)">
        Sign in to continue
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-(--text)">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            disabled={loading}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-(--input-border) bg-(--input-bg) px-4 py-3 text-(--text) outline-none transition focus:border-(--accent) focus:ring-2 focus:ring-(--accent) disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-(--text)">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={loading}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-(--input-border) bg-(--input-bg) px-4 py-3 text-(--text) outline-none transition focus:border-(--accent) focus:ring-2 focus:ring-(--accent) disabled:opacity-50"
          />
        </div>
        {error && (
          <div className="rounded-lg border border-(--danger-text) bg-(--danger-bg) px-4 py-3 text-sm text-(--danger-text)">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-(--accent) px-4 py-3 font-semibold text-(--accent-contrast) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-(--text-secondary)">
        Demo account:
        <br />
        demo@example.com
        <br />
        password123
      </p>
    </div>
  );
}
