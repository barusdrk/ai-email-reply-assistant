import { useEffect, useState } from "react";
import API from "../services/api.js";

export default function SettingsPage() {
  const [provider, setProvider] = useState("openai");
  const [tone, setTone] = useState("professional");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await API.get("/settings");
      setProvider(data.provider);
      setTone(data.defaultReplyTone);
    }
    void load();
  }, []);

  async function save() {
    await API.put("/settings", { provider, defaultReplyTone: tone });
    setMessage("Settings saved.");
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-(--text-h)">AI Settings</h1>

      <div className="space-y-4 rounded-lg border border-(--border) bg-(--surface) p-6">
        <label className="block text-(--text)">
          AI Provider
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="mt-2 w-full rounded border border-(--input-border) bg-(--input-bg) p-2 text-(--text) focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--accent)"
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
        </label>

        <label className="block text-(--text)">
          Default Reply Tone
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="mt-2 w-full rounded border border-(--input-border) bg-(--input-bg) p-2 text-(--text) focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--accent)"
          >
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="empathetic">Empathetic</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => void save()}
          className="rounded bg-(--accent) px-4 py-2 text-(--accent-contrast) hover:bg-(--accent-hover)"
        >
          Save
        </button>

        {message && <p className="text-sm text-(--info-text)">{message}</p>}
      </div>
    </div>
  );
}
