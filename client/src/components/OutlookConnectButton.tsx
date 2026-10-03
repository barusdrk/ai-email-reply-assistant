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
      disabled={loading}
      onClick={onConnect}
      className="flex w-full items-center justify-center gap-3 rounded-lg bg-(--accent) px-5 py-3 text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 max-w-64"
    >
      <span className="font-medium">
        {loading ? (connected ? "Disconnecting..." : "Connecting...") : connected ? "Disconnect Outlook" : "Connect Outlook"}
      </span>
    </button>
  );
}
