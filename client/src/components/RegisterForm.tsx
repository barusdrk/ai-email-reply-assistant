import { type FormEvent, useState } from "react";

interface RegisterFormProps {
  onSubmit: (name: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  loading?: boolean;
  error?: string;
}

export default function RegisterForm({ onSubmit, loading = false, error }: RegisterFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(name, email, password, confirmPassword);
  }

  const inputClass = "w-full rounded-lg border border-(--input-border) bg-(--input-bg) px-4 py-3 text-(--text) placeholder:text-(--placeholder) outline-none transition focus:border-(--accent) focus:ring-2 focus:ring-(--accent) disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-(--border) bg-(--surface) p-8 shadow-lg">
      <h1 className="mb-2 text-center text-3xl font-bold text-(--text-h)">Create Account</h1>
      <p className="mb-8 text-center text-(--text-secondary)">Register to use the AI Email Reply Assistant</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="register-name" className="mb-2 block text-sm font-medium text-(--text)">Name</label>
          <input id="register-name" type="text" required autoComplete="name" disabled={loading} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="register-email" className="mb-2 block text-sm font-medium text-(--text)">Email</label>
          <input id="register-email" type="email" required autoComplete="email" disabled={loading} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="register-password" className="mb-2 block text-sm font-medium text-(--text)">Password</label>
          <input id="register-password" type="password" required autoComplete="new-password" disabled={loading} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-(--text)">Confirm Password</label>
          <input id="confirm-password" type="password" required autoComplete="new-password" disabled={loading} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
        </div>
        {error && (
          <div className="rounded-lg border border-(--danger-text) bg-(--danger-bg) px-4 py-3 text-sm text-(--danger-text)">
            {error}
          </div>
        )}
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-(--accent) px-4 py-3 font-semibold text-(--accent-contrast) transition hover:bg-(--accent-hover) disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}
