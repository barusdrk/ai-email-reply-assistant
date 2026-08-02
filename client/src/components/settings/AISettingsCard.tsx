interface Props {
  provider: "openai" | "groq" | "gemini";
  onProviderChange: (
    value: "openai" | "groq" | "gemini"
  ) => void;

  autoDraft: boolean;
  onAutoDraftChange: (
    value: boolean
  ) => void;
}

export default function AISettingsCard({
  provider,
  onProviderChange,
  autoDraft,
  onAutoDraftChange,
}: Props) {
  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-4 text-lg font-semibold dark:text-white">
        AI Settings
      </h2>

      <div className="mb-5">
        <label className="mb-2 block text-sm font-medium dark:text-white">
          AI Provider
        </label>

        <select
          value={provider}
          onChange={(e) =>
            onProviderChange(
              e.target.value as
                | "openai"
                | "groq"
                | "gemini"
            )
          }
          className="w-full rounded-md border px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        >
          <option value="openai">
            OpenAI
          </option>

          <option value="groq">
            Groq
          </option>

          <option value="gemini">
            Google Gemini
          </option>
        </select>
      </div>

      <label className="flex items-center justify-between">
        <span className="dark:text-white">
          Enable AI auto drafts
        </span>

        <input
          type="checkbox"
          checked={autoDraft}
          onChange={(e) =>
            onAutoDraftChange(
              e.target.checked
            )
          }
        />
      </label>
    </section>
  );
}
