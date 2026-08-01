import {
  useEffect,
  useState,
} from "react";

import API from "../services/api.js";

export default function SettingsPage() {
  const [provider, setProvider] =
    useState("openai");

  const [tone, setTone] =
    useState("professional");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    async function load() {
      const { data } =
        await API.get(
          "/settings"
        );

      setProvider(
        data.provider
      );

      setTone(
        data.defaultTone
      );
    }

    load();
  }, []);

  async function save() {
    await API.put(
      "/settings",
      {
        provider,
        defaultTone:
          tone,
      }
    );

    setMessage(
      "Settings saved."
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-6 text-2xl font-bold">
        AI Settings
      </h1>

      <div className="space-y-4 rounded-lg border p-6">
        <label className="block">
          AI Provider
          <select
            value={provider}
            onChange={(e) =>
              setProvider(
                e.target.value
              )
            }
            className="mt-2 w-full rounded border p-2"
          >
            <option value="openai">
              OpenAI
            </option>

            <option value="gemini">
              Gemini
            </option>
          </select>
        </label>

        <label className="block">
          Default Tone
          <select
            value={tone}
            onChange={(e) =>
              setTone(
                e.target.value
              )
            }
            className="mt-2 w-full rounded border p-2"
          >
            <option value="professional">
              Professional
            </option>

            <option value="friendly">
              Friendly
            </option>

            <option value="empathetic">
              Empathetic
            </option>
          </select>
        </label>

        <button
          onClick={save}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Save
        </button>

        {message && (
          <p>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
