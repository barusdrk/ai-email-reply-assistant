interface Props {
  autoDraft: boolean;
  onAutoDraftChange: (
    value: boolean
  ) => void;
}

export default function AISettingsCard({
  autoDraft,
  onAutoDraftChange,
}: Props) {
  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-4 text-lg font-semibold dark:text-white">
        AI Settings
      </h2>

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
