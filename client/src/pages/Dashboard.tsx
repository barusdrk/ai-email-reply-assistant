import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardStats, type DashboardStats } from "../services/dashboard.js";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    inboxEmails: 0,
    draftReplies: 0,
    pendingApprovals: 0,
    sentToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");
        const data = await getDashboardStats();
        setStats(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    }
    void loadDashboard();
  }, []);

  const statCards = [
    { label: "Inbox Emails", value: stats.inboxEmails, color: "bg-blue-500" },
    { label: "Draft Replies", value: stats.draftReplies, color: "bg-yellow-500" },
    { label: "Pending Approvals", value: stats.pendingApprovals, color: "bg-orange-500" },
    { label: "Sent Today", value: stats.sentToday, color: "bg-green-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-(--text-h)">Dashboard</h1>
        <p className="mt-2 text-(--text-secondary)">Welcome to your AI Email Reply Assistant.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-(--danger-text) bg-(--danger-bg) p-4 text-(--danger-text)">
          {error}
        </div>
      )}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
            <div className={`mb-4 h-3 w-16 rounded-full ${stat.color}`} />
            <div className="text-4xl font-bold text-(--text-h)">
              {loading ? "..." : stat.value}
            </div>
            <div className="mt-2 text-(--text-secondary)">{stat.label}</div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-(--text-h)">Quick Actions</h2>

        <div className="flex flex-wrap gap-4">
          <Link
            to="/inbox"
            className="rounded-lg bg-(--accent) px-5 py-3 text-(--accent-contrast) hover:opacity-90"
          >
            Open Inbox
          </Link>

          <Link
            to="/drafts"
            className="rounded-lg bg-(--warning) px-5 py-3 text-(--warning-contrast) hover:opacity-90"
          >
            View Drafts
          </Link>

          <Link
            to="/approvals"
            className="rounded-lg bg-(--info) px-5 py-3 text-(--accent-contrast) hover:opacity-90"
          >
            Review Approvals
          </Link>

          <Link
            to="/settings"
            className="rounded-lg bg-(--settings) px-5 py-3 text-(--accent-contrast) hover:opacity-90"
          >
            Settings
          </Link>
        </div>
      </section>
    </div>
  );
}
