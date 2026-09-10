import API from "./api.js";

export type EmailProvider = "gmail" | "outlook";

export interface ConnectedAccounts {
  gmail: boolean;
  outlook: boolean;
  activeProvider: EmailProvider | null;
}

export async function getConnections(): Promise<ConnectedAccounts> {
  const { data } = await API.get<ConnectedAccounts>("/accounts");
  return {
    gmail: Boolean(data.gmail),
    outlook: Boolean(data.outlook),
    activeProvider:
      data.activeProvider === "gmail" || data.activeProvider === "outlook"
        ? data.activeProvider
        : null,
  };
}

export async function setActiveProvider(provider: EmailProvider): Promise<void> {
  await API.put("/accounts/provider", { provider });
}

export async function connectGmail(): Promise<void> {
  const { data } = await API.get<{ url: string }>("/accounts/gmail/connect");
  console.log("Google OAuth URL:", data.url);
  window.location.href = data.url;
}

export async function connectOutlook(): Promise<void> {
  const { data } = await API.get<{ url: string }>("/accounts/outlook/connect");
  window.location.href = data.url;
}

export async function disconnectGmail(): Promise<void> {
  await API.delete("/accounts/gmail");
}

export async function disconnectOutlook(): Promise<void> {
  await API.delete("/accounts/outlook");
}
