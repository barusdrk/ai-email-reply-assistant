interface Props {
  syncing: boolean;
  loadingSamples: boolean;
  onSync: () => void;
  onLoadSamples: () => void;
}

export default function InboxActions({ syncing, loadingSamples, onSync, onLoadSamples }: Props) {
  const disabled = syncing || loadingSamples;

  return (
    <div className="space-y-3">
      <button type="button" onClick={onSync} disabled={disabled} className="w-full rounded-lg bg-(--accent) px-4 py-2 font-medium text-(--accent-contrast) transition hover:bg-(--accent-hover) disabled:cursor-not-allowed disabled:opacity-50">
        {syncing ? "Syncing..." : "Sync Gmail & Outlook"}
      </button>
      <button type="button" onClick={onLoadSamples} disabled={disabled} className="w-full rounded-lg border border-(--accent) px-4 py-2 font-medium text-(--accent) transition hover:bg-(--surface-hover) disabled:cursor-not-allowed disabled:opacity-50">
        {loadingSamples ? "Loading Samples..." : "Load Sample Emails"}
      </button>
    </div>
  );
}
