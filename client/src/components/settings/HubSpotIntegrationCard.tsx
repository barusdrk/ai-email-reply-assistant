import { useEffect, useState } from "react";

type HubSpotStatus = {
  connected: boolean;
  account?: {
    hubId: string;
    connected: boolean;
    connectedAt?: string;
    expiresAt?: string;
  } | null;
};

const API_BASE_URL = "http://localhost:3001/api";

export default function HubSpotIntegrationCard() {
  const [status, setStatus] = useState<HubSpotStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStatus() {
    const token = localStorage.getItem("token");
    if (!token) {
      setStatusLoading(false);
      setError("Authentication required.");
      return;
    }
    try {
      setStatusLoading(true);
      setError("");
      const response = await fetch(`${API_BASE_URL}/crm/hubspot/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load HubSpot connection status.");
      setStatus(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load HubSpot connection status.");
    } finally {
      setStatusLoading(false);
    }
  }

  async function connectHubSpot() {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication required.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_BASE_URL}/crm/hubspot/connect`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.authorizationUrl) throw new Error(data.message || "Failed to start HubSpot connection.");
      const width = 600;
      const height = 750;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      window.open(
        data.authorizationUrl,
        "hubspot-oauth",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to start HubSpot connection.");
    } finally {
      setLoading(false);
    }
  }

  async function disconnectHubSpot() {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication required.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_BASE_URL}/crm/hubspot/disconnect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to disconnect HubSpot.");
      await loadStatus();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to disconnect HubSpot.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== "hubspot-oauth-success") return;
      void loadStatus();
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-(--text-h)">CRM integrations</h2>
        <p className="mt-1 text-sm text-(--text-secondary)">
          Connect HubSpot to use customer and company information when generating support replies.
        </p>
      </div>

      {statusLoading ? (
        <p className="text-sm text-(--text-secondary)">Checking HubSpot connection...</p>
      ) : (
        <div className="rounded-lg border border-(--border) p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${status?.connected ? "bg-emerald-500" : "bg-gray-400"}`} />
                <h3 className="font-medium text-(--text-h)">HubSpot</h3>
              </div>
              <p className="mt-1 text-sm text-(--text-secondary)">
                {status?.connected
                  ? `Connected${status.account?.hubId ? ` · Portal ${status.account.hubId}` : ""}`
                  : "Not connected"}
              </p>
              {status?.connected && status.account?.connectedAt && (
                <p className="mt-1 text-xs text-(--text-secondary)">
                  Connected {new Date(status.account.connectedAt).toLocaleString()}
                </p>
              )}
            </div>

            {status?.connected ? (
              <button
                type="button"
                onClick={() => void disconnectHubSpot()}
                disabled={loading}
                className="rounded-lg border border-(--border) px-4 py-2 text-sm font-medium text-(--text-h) transition hover:bg-(--surface-hover) disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Disconnecting..." : "Disconnect HubSpot"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void connectHubSpot()}
                disabled={loading}
                className="rounded-lg bg-(--accent) px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Connecting..." : "Connect HubSpot"}
              </button>
            )}
          </div>

          {status?.connected && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-(--bg-secondary) p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-(--text-secondary)">Contacts</p>
                <p className="mt-1 text-sm font-medium text-(--text-h)">Read access enabled</p>
              </div>
              <div className="rounded-lg bg-(--bg-secondary) p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-(--text-secondary)">Companies</p>
                <p className="mt-1 text-sm font-medium text-(--text-h)">Read access enabled</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-(--danger-text) bg-(--danger-bg) p-3 text-sm text-(--danger-text)" role="alert">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
