import GmailConnectButton from "../GmailConnectButton.js";
import OutlookConnectButton from "../OutlookConnectButton.js";

interface Props {
  gmailConnected: boolean;
  outlookConnected: boolean;
  onConnectGmail: () => void;
  onConnectOutlook: () => void;
}

export default function ConnectedAccountsCard({
  gmailConnected,
  outlookConnected,
  onConnectGmail,
  onConnectOutlook,
}: Props) {
  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-4 text-lg font-semibold dark:text-white">
        Connected Accounts
      </h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="dark:text-white">
            Gmail
          </span>

          <div className="flex items-center gap-3">
            <span
              className={
                gmailConnected
                  ? "text-green-600"
                  : "text-gray-500"
              }
            >
              {gmailConnected
                ? "Connected"
                : "Not connected"}
            </span>

            <GmailConnectButton
              onConnect={onConnectGmail}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="dark:text-white">
            Outlook
          </span>

          <div className="flex items-center gap-3">
            <span
              className={
                outlookConnected
                  ? "text-green-600"
                  : "text-gray-500"
              }
            >
              {outlookConnected
                ? "Connected"
                : "Not connected"}
            </span>

            <OutlookConnectButton
              onConnect={onConnectOutlook}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
