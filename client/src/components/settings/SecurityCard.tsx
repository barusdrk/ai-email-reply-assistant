import { useState } from "react";

interface Props {
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export default function SecurityCard({ onChangePassword }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-(--text-h)">Security</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full rounded-md border border-(--border) bg-(--bg) px-3 py-2 text-(--text) outline-none focus:ring-2 focus:ring-(--accent)" />
        <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-md border border-(--border) bg-(--bg) px-3 py-2 text-(--text) outline-none focus:ring-2 focus:ring-(--accent)" />
        <button type="submit" disabled={loading} className="rounded-md bg-(--accent) px-4 py-2 text-(--accent-contrast) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? "Saving..." : "Change Password"}
        </button>
      </form>
    </section>
  );
}
