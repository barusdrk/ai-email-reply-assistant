import { useState } from "react";
import { createDraft } from "../../services/drafts.js";
import type { ReplyTone } from "../../types/settings.js";
import type { ReplyLengthValue } from "../LengthSelector.js";

interface Props {
  reply: string;
  onChange?: (value: string) => void;
  emailId: string;
  subject: string;
  customer: string;
  tone?: ReplyTone;
  length?: ReplyLengthValue;
}

export default function ReplyCard({
  reply,
  onChange,
  emailId,
  subject,
  customer,
  tone = "formal",
  length = "medium",
}: Props) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSaveDraft() {
    if (!reply.trim()) {
      setMessage("Generate a reply before saving a draft.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await createDraft({
        emailId,
        subject,
        customer,
        reply: reply.trim(),
        tone,
        length,
      });
      setMessage("Draft saved successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save draft."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold dark:text-white">
          Generated Reply
        </h2>

        <button
          type="button"
          onClick={() => void handleSaveDraft()}
          disabled={saving || !reply.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Draft"}
        </button>
      </div>

      <textarea
        value={reply}
        onChange={(event) =>
          onChange?.(event.target.value)
        }
        placeholder="Generated reply will appear here..."
        rows={10}
        className="min-h-48 w-full resize-y rounded-lg border p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      />

      {message && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          {message}
        </p>
      )}
    </section>
  );
}
