import { useEffect, useState } from "react";
import ProfileCard from "../components/settings/ProfileCard.js";
import AppearanceCard from "../components/settings/AppearanceCard.js";
import SignatureCard from "../components/settings/SignatureCard.js";
import ConnectedAccountsCard from "../components/settings/ConnectedAccountsCard.js";
import NotificationsCard from "../components/settings/NotificationsCard.js";
import SecurityCard from "../components/settings/SecurityCard.js";
import DangerZoneCard from "../components/settings/DangerZoneCard.js";
import ToneSelector from "../components/ToneSelector.js";
import LengthSelector from "../components/LengthSelector.js";
import {
  getSettings,
  updateSettings,
  type AISettings,
} from "../services/settings.js";
import {
  getConnections,
  connectGmail,
  connectOutlook,
  disconnectGmail,
  disconnectOutlook,
} from "../services/accounts.js";
import {
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
  type UserProfile,
} from "../services/users.js";
import type { ReplyLength } from "../components/LengthSelector.js";
import ProviderSelector from "../components/ProviderSelector.js";

export default function Settings() {
  const [settings, setSettings] =
    useState<AISettings | null>(null);
  const [user, setUser] =
    useState<UserProfile | null>(null);
  const [gmailConnected, setGmailConnected] =
    useState(false);
  const [outlookConnected, setOutlookConnected] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setError("");
        const [
          loadedSettings,
          connections,
          loadedUser,
        ] = await Promise.all([
          getSettings(),
          getConnections(),
          getMe(),
        ]);

        setSettings(loadedSettings);
        setUser(loadedUser);
        setGmailConnected(connections.gmail);
        setOutlookConnected(connections.outlook);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load settings."
        );
      }
    }

    void load();
  }, []);

  async function save(data: Partial<AISettings>) {
    if (!settings) {
      return;
    }

    const previousSettings = settings;
    setSettings({
      ...settings,
      ...data,
    });

    try {
      const updated = await updateSettings(data);
      setSettings(updated);
    } catch (error) {
      setSettings(previousSettings);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update settings."
      );
    }
  }

  async function saveProfile(
    data: Partial<
      Pick<UserProfile, "name" | "email" | "avatar">
    >
  ) {
    try {
      const updated = await updateProfile(data);
      setUser(updated);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update profile."
      );
    }
  }

  async function handleGmail() {
    try {
      if (gmailConnected) {
        await disconnectGmail();
        setGmailConnected(false);
        return;
      }

      await connectGmail();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to connect Gmail."
      );
    }
  }

  async function handleOutlook() {
    try {
      if (outlookConnected) {
        await disconnectOutlook();
        setOutlookConnected(false);
        return;
      }

      await connectOutlook();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to connect Outlook."
      );
    }
  }

  async function handleDeleteAccount() {
    try {
      await deleteAccount();
      localStorage.removeItem("token");
      window.location.href = "/login";
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete account."
      );
    }
  }

  if (error) {
    return (
      <div className="p-6 text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!settings || !user) {
    return (
      <div className="p-6 dark:text-white">
        Loading settings...
      </div>
    );
  }

  const lengthValue: ReplyLength =
    settings.defaultLength;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold dark:text-white">
        Settings
      </h1>

      <ProfileCard
        name={user.name}
        email={user.email}
        avatar={user.avatar ?? ""}
        onSave={saveProfile}
      />

      <AppearanceCard />

      <div className="grid gap-4 md:grid-cols-3">
        <ProviderSelector
          value={settings.provider}
          onChange={(provider) => {
            void save({ provider });
          }}
        />

        <ToneSelector
          value={settings.defaultReplyTone}
          onChange={(value) => {
            if (value !== "default") {
              void save({
                defaultReplyTone: value,
              });
            }
          }}
          label="Default Reply Tone"
        />

        <LengthSelector
          value={settings.defaultLength as ReplyLength}
          onChange={(defaultLength) => {
            if (defaultLength !== "default") {
              void save({
                defaultLength,
              });
            }
          }}
          label="Default Reply Length"
        />
      </div>


      <SignatureCard
        value={settings.signature ?? ""}
        onChange={(signature) => {
          void save({ signature });
        }}
      />

      <ConnectedAccountsCard
        gmailConnected={gmailConnected}
        outlookConnected={outlookConnected}
        onConnectGmail={handleGmail}
        onConnectOutlook={handleOutlook}
      />

      <NotificationsCard
        emailNotifications={
          settings.emailNotifications
        }
        onEmailNotificationsChange={(
          emailNotifications
        ) => {
          void save({ emailNotifications });
        }}
        desktopNotifications={
          settings.desktopNotifications
        }
        onDesktopNotificationsChange={(
          desktopNotifications
        ) => {
          void save({ desktopNotifications });
        }}
      />

      <SecurityCard
        onChangePassword={async (
          currentPassword,
          newPassword
        ) => {
          await changePassword(
            currentPassword,
            newPassword
          );
        }}
      />

      <DangerZoneCard
        onDeleteAccount={handleDeleteAccount}
      />
    </div>
  );
}
