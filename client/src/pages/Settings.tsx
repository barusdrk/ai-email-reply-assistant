import { useState } from "react";

import ProfileCard from "../components/settings/ProfileCard";
import AppearanceCard from "../components/settings/AppearanceCard";
import SignatureCard from "../components/settings/SignatureCard";
import AISettingsCard from "../components/settings/AISettingsCard";
import ConnectedAccountsCard from "../components/settings/ConnectedAccountsCard";
import NotificationsCard from "../components/settings/NotificationsCard";
import SecurityCard from "../components/settings/SecurityCard";
import DangerZoneCard from "../components/settings/DangerZoneCard";

export default function Settings() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [signature, setSignature] = useState("Customer Support");

  const [provider, setProvider] = useState<
    "openai" | "groq" | "gemini"
  >("groq");

  const [autoDraft, setAutoDraft] =
    useState(false);

  const [gmailConnected] =
    useState(false);

  const [outlookConnected] =
    useState(false);

  const [emailNotifications,
    setEmailNotifications] =
    useState(true);

  const [desktopNotifications,
    setDesktopNotifications] =
    useState(false);

  async function connectGmail() {
    console.log("Connect Gmail");
  }

  async function connectOutlook() {
    console.log("Connect Outlook");
  }

  async function changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    console.log(
      currentPassword,
      newPassword
    );
  }

  async function deleteAccount(): Promise<void> {
    console.log("Delete account");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold dark:text-white">
        Settings
      </h1>

      <ProfileCard
        name={name}
        email={email}
        avatar={avatar}
        onNameChange={setName}
        onEmailChange={setEmail}
        onAvatarChange={setAvatar}
      />

      <AppearanceCard />

      <SignatureCard
        value={signature}
        onChange={setSignature}
      />

      <AISettingsCard
        provider={provider}
        onProviderChange={setProvider}
        autoDraft={autoDraft}
        onAutoDraftChange={setAutoDraft}
      />

      <ConnectedAccountsCard
        gmailConnected={gmailConnected}
        outlookConnected={outlookConnected}
        onConnectGmail={connectGmail}
        onConnectOutlook={connectOutlook}
      />

      <NotificationsCard
        emailNotifications={
          emailNotifications
        }
        onEmailNotificationsChange={
          setEmailNotifications
        }
        desktopNotifications={
          desktopNotifications
        }
        onDesktopNotificationsChange={
          setDesktopNotifications
        }
      />

      <SecurityCard
        onChangePassword={
          changePassword
        }
      />

      <DangerZoneCard
        onDeleteAccount={
          deleteAccount
        }
      />
    </div>
  );
}
