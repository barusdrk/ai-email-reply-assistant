import { useState } from "react";

import GmailConnectButton from "../components/GmailConnectButton";
import OutlookConnectButton from "../components/OutlookConnectButton";
import SignatureInput from "../components/SignatureInput";

import { useTheme } from "../context/ThemeContext";
import { connectGmail, connectOutlook } from "../services/email";

export default function Settings() {
  const { theme } = useTheme();

  const [signature, setSignature] = useState("Customer Support");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold dark:text-white">Settings</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold dark:text-white">Email Accounts</h2>

          <GmailConnectButton onConnect={connectGmail} />

          <OutlookConnectButton onConnect={connectOutlook} />
        </div>

        <div>
          <h2 className="mb-2 font-semibold dark:text-white">Signature</h2>

          <SignatureInput value={signature} onChange={setSignature} />
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-semibold dark:text-white">Theme</h2>
        <div className="text-gray-600 dark:text-gray-400">{theme}</div>
      </div>
    </div>
  );
}
