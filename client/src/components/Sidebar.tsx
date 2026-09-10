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
        <ul className="space-y-2">
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
                <span className="text-lg">{link.icon}</span>
                <span className="font-medium">{link.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-(--border) p-4">
        <button type="button" onClick={handleLogout} className="w-full rounded-lg bg-(--danger) px-4 py-3 font-medium text-white transition hover:opacity-90">
          Logout
        </button>
        <p className="mt-4 text-center text-xs text-(--text-secondary)">
          AI Email Reply Assistant
          <br />
          Version 1.0
        </p>
      </div>
    </aside>
  );
}
