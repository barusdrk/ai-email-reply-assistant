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
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          AI Email Reply Assistant
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage emails with AI
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
        >
          {theme === "dark"
            ? "☀ Light"
            : "🌙 Dark"}
        </button>

        <div className="text-right">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {user?.email}
          </div>

          <div className="text-xs text-gray-500">
            Logged in
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
