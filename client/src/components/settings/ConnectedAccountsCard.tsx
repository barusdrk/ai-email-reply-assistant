import GmailConnectButton from "../GmailConnectButton.js";
import OutlookConnectButton from "../OutlookConnectButton.js";

interface Props {
  gmailConnected: boolean;
  outlookConnected: boolean;
  onConnectGmail: () => void;
  onConnectOutlook: () => void;
}

export default function ConnectedAccountsCard({ gmailConnected, outlookConnected, onConnectGmail, onConnectOutlook }: Props) {
  const accounts = [
    { name: "Gmail", connected: gmailConnected, onConnect: onConnectGmail },
    { name: "Outlook", connected: outlookConnected, onConnect: onConnectOutlook },
  ];

  return (
    <section className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-(--text-h)">Connected Accounts</h2>
        <p className="mt-1 text-sm text-(--text-secondary)">
          Connect an account to sync email and send replies.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {accounts.map(({ name, connected, onConnect }) => (
          <div key={name} className="rounded-lg border border-(--border) p-4">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500" : "bg-gray-400"}`} />
              <h3 className="font-medium text-(--text-h)">{name}</h3>
            </div>
            <p className="mt-1 text-sm text-(--text-secondary)">
              {connected ? "Connected" : "Not connected"}
            </p>
            <div className="mt-4">
              {name === "Gmail" ? (
                <GmailConnectButton connected={connected} onConnect={onConnect} />
              ) : (
                <OutlookConnectButton connected={connected} onConnect={onConnect} />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
