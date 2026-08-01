import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useState } from "react";

import "./App.css";

import EmailInput from "./components/EmailInput.js";
import ToneSelector, {
  type Tone,
} from "./components/ToneSelector.js";
import LengthSelector, {
  type ReplyLength,
} from "./components/LengthSelector.js";
import SignatureInput from "./components/SignatureInput.js";
import ReplyCard from "./components/ReplyCard.js";
import LoadingSpinner from "./components/LoadingSpinner.js";

import SettingsPage from "./pages/SettingsPage.js";
import BillingPage from "./pages/BillingPage.js";

import {
  generateReply,
} from "./services/email.js";

import {
  logout,
} from "./services/auth.js";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Dashboard />}
        />

        <Route
          path="/settings"
          element={<SettingsPage />}
        />

        <Route
          path="/billing"
          element={<BillingPage />}
        />
      </Routes>
    </BrowserRouter>
  );
}

function Dashboard() {
  const [email, setEmail] =
    useState("");

  const [tone, setTone] =
    useState<Tone>("friendly");

  const [length, setLength] =
    useState<ReplyLength>("medium");

  const [signature, setSignature] =
    useState("Customer Support");

  const [reply, setReply] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [darkMode, setDarkMode] =
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
      const result =
        await generateReply({
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
      <main className="mx-auto max-w-5xl p-6 space-y-8">

        <header className="flex items-center justify-between">

          <div>

            <h1 className="text-3xl font-bold">
              AI Email Reply Assistant
            </h1>

            <p className="text-gray-600 dark:text-gray-300">
              Generate professional AI email replies.
            </p>

          </div>

          <div className="flex gap-2">

            <Link
              to="/settings"
              className="rounded-lg border px-4 py-2"
            >
              Settings
            </Link>

            <Link
              to="/billing"
              className="rounded-lg border px-4 py-2"
            >
              Billing
            </Link>

            <button
              onClick={() =>
                setDarkMode(v => !v)
              }
              className="rounded-lg border px-4 py-2"
            >
              {darkMode
                ? "☀ Light"
                : "🌙 Dark"}
            </button>

            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Logout
            </button>

          </div>

        </header>

        <section className="rounded-lg border bg-white p-6 shadow dark:border-gray-700 dark:bg-gray-800">

          <div className="space-y-6">

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
              onClick={
                handleGenerateReply
              }
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading
                ? "Generating..."
                : "Generate Reply"}
            </button>

            {error && (
              <p className="rounded-lg bg-red-100 p-3 text-red-700 dark:bg-red-900 dark:text-red-300">
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
