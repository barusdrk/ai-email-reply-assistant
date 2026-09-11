import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

const links = [
  { label: "Dashboard", path: "/dashboard", icon: "🏠" },
  { label: "Inbox", path: "/inbox", icon: "📥" },
  { label: "Drafts", path: "/drafts", icon: "📝" },
  { label: "Approvals", path: "/approvals", icon: "✔" },
  { label: "Sent", path: "/sent", icon: "📤" },
  { label: "Knowledge Base", path: "/knowledge-base", icon: "📚" },
  { label: "Billing", path: "/billing", icon: "💳" },
  { label: "Settings", path: "/settings", icon: "⚙" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="flex w-64 flex-col border-r border-(--border) bg-(--surface)">
      <div className="border-b border-(--border) p-6">
        <h2 className="text-xl font-bold text-(--accent)">AI Assistant</h2>
        <p className="mt-1 text-sm text-(--text-secondary)">Email Workspace</p>
      </div>
      <nav className="flex-1 p-4">
        <ul>
          {links.map((link) => (
            <li key={link.path}>
              <NavLink
                to={link.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-4 py-3 transition ${
                    isActive
                      ? "bg-(--accent) text-(--accent-contrast)"
                      : "text-(--text) hover:bg-(--surface-hover)"
                  }`
                }
              >
                <span className="flex w-6 shrink-0 justify-center text-lg">
                  {link.icon}
                </span>
                <span className="font-medium">{link.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-(--text) transition hover:bg-(--surface-hover)"
        >
          <span className="flex w-6 shrink-0 justify-center">
            <svg
              fill="currentColor"
              className="h-4 w-4 shrink-0"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M3 15H9C9.26512 14.9997 9.5193 14.8942 9.70677 14.7068C9.89424 14.5193 9.9997 14.2651 10 14V12.5H9V14H3V2H9V3.5H10V2C9.9997 1.73488 9.89424 1.4807 9.70677 1.29323C9.5193 1.10576 9.26512 1.0003 9 1H3C2.73488 1.0003 2.4807 1.10576 2.29323 1.29323C2.10576 1.4807 2.0003 1.73488 2 2V14C2.0003 14.2651 2.10576 14.5193 2.29323 14.7068 2.4807 14.8942 2.73488 14.9997 3 15Z" />
              <path d="M10.293 10.293L12.086 8.5H5V7.5H12.086L10.293 5.707L11 5L14 8L11 11L10.293 10.293Z" />
            </svg>
          </span>
          <span className="font-medium">Sign out</span>
        </button>
      </nav>
      <div className="border-t border-(--border) p-4">
        <p className="mt-4 text-center text-xs text-(--text-secondary)">
          AI Email Reply Assistant
          <br />
          Version 1.0
        </p>
      </div>
    </aside>
  );
}
