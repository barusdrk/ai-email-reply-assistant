import {
  NavLink,
} from "react-router-dom";

const links = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "🏠",
  },
  {
    label: "Inbox",
    path: "/inbox",
    icon: "📥",
  },
  {
    label: "Drafts",
    path: "/drafts",
    icon: "📝",
  },
  {
    label: "Approvals",
    path: "/approvals",
    icon: "✔",
  },
  {
    label: "Sent",
    path: "/sent",
    icon: "📤",
  },
  {
    label: "Settings",
    path: "/settings",
    icon: "⚙",
  },
];

export default function Sidebar() {
  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 p-6 dark:border-gray-700">
        <h2 className="text-xl font-bold text-blue-600">
          AI Assistant
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Email Workspace
        </p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.path}>
              <NavLink
                to={link.path}
                className={({ isActive }) =>
                  `
                  flex
                  items-center
                  gap-3
                  rounded-lg
                  px-4
                  py-3
                  transition

                  ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  }
                  `
                }
              >
                <span className="text-lg">
                  {link.icon}
                </span>

                <span className="font-medium">
                  {link.label}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-gray-200 p-4 text-center text-xs text-gray-500 dark:border-gray-700">
        AI Email Reply Assistant

        <br />

        Version 1.0
      </div>
    </aside>
  )
}
