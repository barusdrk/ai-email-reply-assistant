import { useState } from "react";

import "./App.css";

import EmailInput from "./components/EmailInput.js";
import LengthSelector, {
  type ReplyLength,
} from "./components/LengthSelector.js";
import LoadingSpinner from "./components/LoadingSpinner.js";
import ReplyCard from "./components/ReplyCard.js";
import SignatureInput from "./components/SignatureInput.js";
import ToneSelector, {
  type Tone,
} from "./components/ToneSelector.js";

import { generateReply } from "./services/email.js";
import { logout } from "./services/auth.js";

export default function App() {
  const [email, setEmail] = useState("");

  const [tone, setTone] =
    useState<Tone>("friendly");

  const [length, setLength] =
    useState<ReplyLength>("medium");

  const [signature, setSignature] =
    useState("Customer Support");

  const [reply, setReply] =
    useState("");

  const [darkMode, setDarkMode] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleGenerateReply() {
    if (!email.trim()) {
      setError(
        "Please paste the customer's email."
      );
      return;
    }

    setLoading(true);
    setError("");
    setReply("");

    try {
      const result = await generateReply({
        email,
        tone,
        length,
        signature,
      });

      setReply(result.reply);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to generate reply."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();

    window.location.reload();
  }

  return (
    <div
      className={
        darkMode
          ? "dark min-h-screen bg-gray-900 text-white"
          : "min-h-screen bg-gray-100 text-gray-900"
      }
    >
      <main className="mx-auto flex max-w-5xl flex-col gap-8 p-6">

        <header className="flex flex-col gap-4">

          <div className="flex items-center justify-between">

            <h1 className="text-3xl font-bold">
              AI Email Reply Assistant
            </h1>

            <div className="flex gap-2">

              <button
                type="button"
                onClick={() =>
                  setDarkMode(
                    (previous) =>
                      !previous
                  )
                }
                className="
                rounded-lg
                border
                px-4
                py-2
                dark:border-gray-600
                "
              >
                {darkMode
                  ? "☀ Light"
                  : "🌙 Dark"}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="
                rounded-lg
                bg-red-600
                px-4
                py-2
                text-white
                hover:bg-red-700
                "
              >
                Logout
              </button>

            </div>

          </div>

          <p className="text-gray-600 dark:text-gray-300">
            Generate professional customer email replies using AI.
          </p>

        </header>


        <section
          className="
          rounded-lg
          border
          bg-white
          p-6
          shadow-md
          dark:border-gray-700
          dark:bg-gray-800
          "
        >

          <div className="flex flex-col gap-6">

            <EmailInput
              value={email}
              onChange={setEmail}
              disabled={loading}
            />


            <ToneSelector
              value={tone}
              onChange={setTone}
              disabled={loading}
            />


            <LengthSelector
              value={length}
              onChange={setLength}
              disabled={loading}
            />


            <SignatureInput
              value={signature}
              onChange={setSignature}
              disabled={loading}
            />


            <button
              type="button"
              onClick={handleGenerateReply}
              disabled={loading}
              className="
              rounded-lg
              bg-blue-600
              px-6
              py-3
              font-semibold
              text-white
              hover:bg-blue-700
              disabled:bg-blue-300
              "
            >
              {loading
                ? "Generating..."
                : "Generate Reply"}
            </button>


            {error && (
              <p
                className="
                rounded-lg
                bg-red-100
                p-3
                text-red-700
                dark:bg-red-900
                dark:text-red-300
                "
              >
                {error}
              </p>
            )}

          </div>

        </section>


        {loading ? (
          <LoadingSpinner
            message="Generating AI reply..."
          />
        ) : (
          <ReplyCard
            reply={reply}
          />
        )}

      </main>
    </div>
  );
}
