interface Props {
  syncing: boolean;
  onSync: () => void;
}

export default function InboxActions({ syncing, onSync }: Props) {
  return (
    <div className="space-y-3">
      <button type="button" onClick={onSync} disabled={syncing} className="w-full rounded-lg bg-(--accent) px-4 py-2 font-medium text-(--accent-contrast) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
        {syncing ? "Syncing..." : "Sync Gmail & Outlook"}
      </button>
    </div>
  );
}
