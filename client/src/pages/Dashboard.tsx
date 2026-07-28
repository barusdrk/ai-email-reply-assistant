import { Link } from "react-router-dom";

export default function Dashboard() {
  const stats = [
    {
      label: "Inbox Emails",
      value: 128,
      color: "bg-blue-500",
    },
    {
      label: "Draft Replies",
      value: 24,
      color: "bg-yellow-500",
    },
    {
      label: "Pending Approvals",
      value: 6,
      color: "bg-orange-500",
    },
    {
      label: "Sent Today",
      value: 42,
      color: "bg-green-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>

        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Welcome to your AI Email Reply Assistant.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-300 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <div
              className={`mb-4 h-3 w-16 rounded-full ${stat.color}`}
            />

            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {stat.value}
            </div>

            <div className="mt-2 text-gray-500">
              {stat.label}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-gray-300 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold dark:text-white">
          Quick Actions
        </h2>

        <div className="flex flex-wrap gap-4">
          <Link
            to="/inbox"
            className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700"
          >
            Open Inbox
          </Link>

          <Link
            to="/drafts"
            className="rounded-lg bg-yellow-600 px-5 py-3 text-white hover:bg-yellow-700"
          >
            View Drafts
          </Link>

          <Link
            to="/approvals"
            className="rounded-lg bg-green-600 px-5 py-3 text-white hover:bg-green-700"
          >
            Review Approvals
          </Link>

          <Link
            to="/settings"
            className="rounded-lg bg-gray-700 px-5 py-3 text-white hover:bg-gray-800"
          >
            Settings
          </Link>
        </div>
      </section>
    </div>
  );
}
