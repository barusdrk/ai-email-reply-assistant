interface Props {
  onDeleteAccount: () => Promise<void>;
}

export default function DangerZoneCard({ onDeleteAccount }: Props) {
  async function handleDelete() {
    if (!window.confirm("Delete your account permanently?")) return;
    await onDeleteAccount();
  }

  return (
    <section className="rounded-xl border border-(--danger-border) bg-(--danger-bg) p-6">
      <h2 className="mb-2 text-lg font-semibold text-(--danger)">Danger Zone</h2>
      <p className="mb-4 text-sm text-(--danger-text)">This action cannot be undone.</p>
      <button type="button" onClick={handleDelete} className="rounded-md bg-(--danger) px-4 py-2 text-(--accent-contrast) transition hover:opacity-90">
        Delete Account
      </button>
    </section>
  );
}
