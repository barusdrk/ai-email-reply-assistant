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

type Props = {
  token: string;
  apiBaseUrl?: string;
};

export default function ConnectHubSpotButton({
  token,
  apiBaseUrl = "http://localhost:3001/api",
}: Props) {
  const [status, setStatus] = useState<HubSpotStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStatus() {
    try {
      setStatusLoading(true);
      setError("");

      const response = await fetch(
        `${apiBaseUrl}/crm/hubspot/status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load HubSpot connection status."
        );
      }

      setStatus(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load HubSpot connection status."
      );
    } finally {
      setStatusLoading(false);
    }
  }

  async function connectHubSpot() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${apiBaseUrl}/crm/hubspot/connect`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.authorizationUrl) {
        throw new Error(
          data.message ||
            "Failed to start HubSpot connection."
        );
      }

      const width = 600;
      const height = 750;
      const left =
        window.screenX +
        (window.outerWidth - width) / 2;
      const top =
        window.screenY +
        (window.outerHeight - height) / 2;

      window.open(
        data.authorizationUrl,
        "hubspot-oauth",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to start HubSpot connection."
      );
    } finally {
      setLoading(false);
    }
  }

  async function disconnectHubSpot() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${apiBaseUrl}/crm/hubspot/disconnect`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to disconnect HubSpot."
        );
      }

      await loadStatus();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to disconnect HubSpot."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();

    function handleMessage(event: MessageEvent) {
      if (
        event.origin !== window.location.origin ||
        !event.data ||
        event.data.type !== "hubspot-oauth-success"
      ) {
        return;
      }

      void loadStatus();
    }

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener(
        "message",
        handleMessage
      );
    };
  }, [token, apiBaseUrl]);

  if (statusLoading) {
    return (
      <div>
        <button type="button" disabled>
          Checking HubSpot...
        </button>
      </div>
    );
  }

  return (
    <div>
      {status?.connected ? (
        <>
          <p>
            HubSpot connected
            {status.account?.hubId
              ? ` · Portal ${status.account.hubId}`
              : ""}
          </p>

          <button
            type="button"
            onClick={disconnectHubSpot}
            disabled={loading}
          >
            {loading
              ? "Disconnecting..."
              : "Disconnect HubSpot"}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={connectHubSpot}
          disabled={loading}
        >
          {loading
            ? "Connecting..."
            : "Connect HubSpot"}
        </button>
      )}

      {error && (
        <p role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
