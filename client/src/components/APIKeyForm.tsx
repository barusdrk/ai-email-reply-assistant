import { useState } from "react";
import API from "../services/api.js";

interface Props {
  provider: "openai" | "gemini";
  initialValue?: string;
}

export default function APIKeyForm({ provider, initialValue = "" }: Props) {
  const [apiKey, setApiKey] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    try {
      setSaving(true);
      setMessage("");
      await API.put("/settings/api-key", { provider, apiKey });
      setMessage("API key saved.");
    } catch {
      setMessage("Failed to save API key.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-(--text-h)">
        {provider === "openai" ? "OpenAI API Key" : "Google Gemini API Key"}
      </h3>
      <input
        type="password"
        value={apiKey}
        onChange={(event) => setApiKey(event.target.value)}
        placeholder="Paste your API key"
        className="mt-4 w-full rounded-lg border border-(--border) bg-(--bg) p-3 text-(--text) outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-4 rounded-lg bg-(--accent) px-4 py-2 font-medium text-(--accent-contrast) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save API Key"}
      </button>
      {message && <p className="mt-3 text-sm text-(--text-secondary)">{message}</p>}
    </div>
  );
}
