interface OutlookConnectButtonProps {
  connected?: boolean;
  loading?: boolean;
  onConnect: () => void;
}

export default function OutlookConnectButton({
  connected = false,
  loading = false,
  onConnect,
}: OutlookConnectButtonProps) {
  return (
    <button
      type="button"
      disabled={loading || connected}
      onClick={onConnect}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-(--border) bg-(--surface) px-5 py-3 text-(--text) shadow-sm transition hover:bg-(--surface-hover) disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="text-xl">📨</span>
      <span className="font-medium">
        {loading ? "Connecting..." : connected ? "Outlook Connected" : "Connect Outlook"}
      </span>
    </button>
  );
}
