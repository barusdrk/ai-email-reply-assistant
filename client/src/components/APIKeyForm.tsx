import {
  useState,
} from "react";

import API from "../services/api.js";

interface Props {
  provider:
    | "openai"
    | "gemini";

  initialValue?: string;
}

export default function APIKeyForm({
  provider,
  initialValue = "",
}: Props) {
  const [apiKey, setApiKey] =
    useState(initialValue);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function save() {
    try {
      setSaving(true);
      setMessage("");

      await API.put(
        "/settings/api-key",
        {
          provider,
          apiKey,
        }
      );

      setMessage(
        "API key saved."
      );
    } catch {
      setMessage(
        "Failed to save API key."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border p-6 bg-white dark:bg-gray-900">

      <h3 className="text-lg font-semibold">
        {provider === "openai"
          ? "OpenAI API Key"
          : "Google Gemini API Key"}
      </h3>

      <input
        type="password"
        value={apiKey}
        onChange={event =>
          setApiKey(
            event.target.value
          )
        }
        placeholder="Paste your API key"
        className="mt-4 w-full rounded border p-3"
      />

      <button
        onClick={save}
        disabled={saving}
        className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
      >
        {saving
          ? "Saving..."
          : "Save API Key"}
      </button>

      {message && (
        <p className="mt-3 text-sm">
          {message}
        </p>
      )}

    </div>
  );
}
