interface Props {
  autoDraft: boolean;
  onAutoDraftChange: (value: boolean) => void;
}

export default function AISettingsCard({ autoDraft, onAutoDraftChange }: Props) {
  return (
    <section className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-(--text-h)">AI Settings</h2>
      <label className="flex items-center justify-between text-(--text)">
        <span>Enable AI auto drafts</span>
        <input type="checkbox" checked={autoDraft} onChange={(e) => onAutoDraftChange(e.target.checked)} />
      </label>
    </section>
  );
}
