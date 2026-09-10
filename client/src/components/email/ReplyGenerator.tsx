import { useState } from "react";
import API from "../../services/api.js";
import type { Tone } from "../../types/tone.js";
import type { ReplyLength } from "../LengthSelector.js";

interface Props {
  email: string;
  tone: Tone;
  length: ReplyLength;
  onGenerated: (reply: string) => void;
}

export default function ReplyGenerator({ email, tone, length, onGenerated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateReply() {
    if (!email.trim()) {
      setError("Select an email first.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = await API.post("/reply", { email, tone, length });
      const reply = response.data?.reply ?? "";
      if (!reply) throw new Error("The server returned an empty reply.");
      onGenerated(reply);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to generate reply.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={generateReply} disabled={loading || !email.trim()} className="rounded-lg bg-(--accent) px-4 py-2 text-sm font-medium text-(--accent-contrast) transition hover:bg-(--accent-hover) disabled:cursor-not-allowed disabled:opacity-50">
        {loading ? "Generating..." : "Generate Reply"}
      </button>
      {error && <p className="text-sm text-(--danger)">{error}</p>}
    </div>
  );
}
