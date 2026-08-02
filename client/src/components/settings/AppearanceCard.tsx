import { useMemo } from "react";
import { useTheme } from "../../context/ThemeContext.js";

export default function AppearanceCard() {
  const {
    theme,
    setTheme,
  } = useTheme();

  const timezone = useMemo(
    () =>
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );

  return (
    <section className="rounded-lg border bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-900">
      <h2 className="mb-4 text-lg font-semibold dark:text-white">
        Appearance
      </h2>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium dark:text-white">
            Theme
          </label>

          <select
            className="w-full rounded border px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            value={theme}
            onChange={(e) =>
              setTheme(
                e.target.value as
                  | "light"
                  | "dark"
                  | "system"
              )
            }
          >
            <option value="light">
              Light
            </option>

            <option value="dark">
              Dark
            </option>

            <option value="system">
              System
            </option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium dark:text-white">
            Language
          </label>

          <input
            className="w-full rounded border bg-gray-100 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            value="English"
            readOnly
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium dark:text-white">
            Timezone
          </label>

          <input
            className="w-full rounded border bg-gray-100 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            value={timezone}
            readOnly
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Automatically detected from your browser.
          </p>
        </div>

        <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Save Appearance
        </button>
      </div>
    </section>
  );
}
