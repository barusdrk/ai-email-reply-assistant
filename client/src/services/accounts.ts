import API from "./api.js";

export interface ConnectedAccounts {
  gmail: boolean;
  outlook: boolean;
}

export async function getConnections(): Promise<ConnectedAccounts> {
  const { data } = await API.get<ConnectedAccounts>("/accounts");
  return {
    gmail: Boolean(data.gmail),
    outlook: Boolean(data.outlook),
  };
}

export async function connectGmail(): Promise<void> {
  const { data } = await API.get<{ url: string }>("/accounts/gmail/connect");
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
