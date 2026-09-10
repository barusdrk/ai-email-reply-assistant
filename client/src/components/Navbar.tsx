import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { useTheme } from "../context/ThemeContext.js";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-(--border) bg-(--surface) px-6 shadow-sm">
      <div>
        <h1 className="text-2xl font-bold text-(--text-h)">
          AI Email Reply Assistant
        </h1>
        <p className="text-sm text-(--text-secondary)">
          Manage emails with AI
        </p>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg border border-(--border) px-4 py-2 text-(--text) transition hover:bg-(--surface-hover)"
        >
          {theme === "dark" ? "☀ Light" : "🌙 Dark"}
        </button>
        <div className="text-right">
          <div className="text-sm font-semibold text-(--text)">
            {user?.email}
          </div>
          <div className="text-xs text-(--text-secondary)">
            Logged in
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg bg-(--danger-text) px-4 py-2 text-(--accent-contrast) transition hover:opacity-90"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
