import { useMemo } from "react";

import {
  useTheme,
} from "../../context/ThemeContext.js";

import FormInput from "../ui/FormInput.js";
import FormSelect from "../ui/FormSelect.js";

export default function AppearanceCard() {
  const {
    theme,
    setTheme,
  } = useTheme();

  const timezone = useMemo(
    () =>
      Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone,
    []
  );

  return (
    <section className="rounded-lg border bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-900">
      <h2 className="mb-4 text-lg font-semibold dark:text-white">
        Appearance
      </h2>

      <div className="space-y-5">
        <FormSelect
          label="Theme"
          value={theme}
          onChange={(value) =>
            setTheme(
              value as
                | "light"
                | "dark"
                | "system"
            )
          }
          options={[
            {
              value: "light",
              label: "Light",
            },
            {
              value: "dark",
              label: "Dark",
            },
            {
              value: "system",
              label: "System",
            },
          ]}
        />

        <FormInput
          label="Language"
          value="English"
          onChange={() => {}}
          readOnly
        />

        <div>
          <FormInput
            label="Timezone"
            value={timezone}
            onChange={() => {}}
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
