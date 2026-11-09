interface Props {
  autoDraft: boolean;
  onAutoDraftChange: (value: boolean) => void;
  autoSendEnabled?: boolean;
  onAutoSendEnabledChange?: (value: boolean) => void;
}

export default function AISettingsCard({
  autoDraft,
  onAutoDraftChange,
  autoSendEnabled = false,
  onAutoSendEnabledChange,
}: Props) {
  return (
    <section className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-(--text-h)">
        AI Settings
      </h2>

      <div className="space-y-4">
        <label className="flex cursor-pointer items-start gap-3 text-(--text)">
          <input
            type="checkbox"
            checked={autoDraft}
            onChange={(event) => onAutoDraftChange(event.target.checked)}
            className="mt-1 h-4 w-4 cursor-pointer rounded border-(--border) accent-(--accent)"
          />

          <span>
            <span className="block font-medium">
              Enable AI auto drafts
            </span>
            <span className="block text-sm text-(--text-secondary)">
              Generate draft replies automatically when new customer emails
              are synced.
            </span>
          </span>
        </label>

        {onAutoSendEnabledChange && (
          <label className="flex cursor-pointer items-start gap-3 border-t border-(--border) pt-4 text-(--text)">
            <input
              type="checkbox"
              checked={autoSendEnabled}
              onChange={(event) =>
                onAutoSendEnabledChange(event.target.checked)
              }
              className="mt-1 h-4 w-4 cursor-pointer rounded border-(--border) accent-(--accent)"
            />

            <span>
              <span className="block font-medium">
                Enable automatic sending
              </span>
              <span className="block text-sm text-(--text-secondary)">
                Send only high-confidence replies that pass support and policy
                checks. Disabled by default.
              </span>
            </span>
          </label>
        )}
      </div>
    </section>
  );
}
