interface GmailConnectButtonProps {
  connected?: boolean;
  loading?: boolean;
  onConnect: () => void;
}

export default function GmailConnectButton({
  connected = false,
  loading = false,
  onConnect,
}: GmailConnectButtonProps) {
  return (
    <button
      type="button"
      disabled={loading || connected}
      onClick={onConnect}
      className="
        flex
        w-full
        items-center
        justify-center
        gap-3
        rounded-lg
        border
        border-gray-300
        bg-white
        px-5
        py-3
        text-gray-900
        shadow-sm
        transition
        hover:bg-gray-100
        disabled:cursor-not-allowed
        disabled:opacity-60
        dark:border-gray-700
        dark:bg-gray-800
        dark:text-white
        dark:hover:bg-gray-700
      "
    >
      <span className="text-xl">📧</span>

      <span className="font-medium">
        {loading
          ? "Connecting..."
          : connected
          ? "Gmail Connected"
          : "Connect Gmail"}
      </span>
    </button>
  );
}
