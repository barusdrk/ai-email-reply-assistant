import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getDraft, sendDraft } from "../services/drafts.js";
import type { Draft } from "../types/index.js";

export default function DraftDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("Draft ID is missing.");
      setLoading(false);
      return;
    }

    const draftId = id;

    async function loadDraft() {
      try {
        setLoading(true);
        setError("");
        setDraft(await getDraft(draftId));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load draft."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadDraft();
  }, [id]);

  async function handleSend() {
    if (!id || !draft) return;

    try {
      setSending(true);
      setError("");
      await sendDraft(id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send draft."
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-(--text)">
        Loading draft...
      </div>
    );
  }

  if (error && !draft) {
    return (
      <div className="space-y-4 p-6">
        <Link
          to="/drafts"
          className="inline-flex items-center gap-2 text-(--text-secondary) hover:text-(--text)"
        >
          ← Back to Drafts
        </Link>
        <div className="rounded-xl border border-(--border) bg-(--surface) p-6 text-(--danger-text)">
          {error}
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="space-y-4 p-6">
        <Link
          to="/drafts"
          className="inline-flex items-center gap-2 text-(--text-secondary) hover:text-(--text)"
        >
          ← Back to Drafts
        </Link>
        <div className="rounded-xl border border-(--border) bg-(--surface) p-6 text-(--text-secondary)">
          Draft not found.
        </div>
      </div>
    );
  }

  const canSend =
    draft.status !== "rejected" &&
    Boolean(draft.customer.trim()) &&
    Boolean(draft.subject.trim()) &&
    Boolean(draft.reply.trim());

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/drafts"
          className="inline-flex items-center gap-2 text-(--text-secondary) transition hover:text-(--text)"
        >
          ← Back to Drafts
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-(--text-h)">
              Draft Details
            </h1>
            <p className="mt-2 text-(--text-secondary)">
              Review the AI-generated reply before sending.
            </p>
          </div>

          <span className="rounded-lg bg-(--warning-bg) px-3 py-1.5 text-sm font-medium text-(--warning-text)">
            {draft.status}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-(--border) bg-(--surface) p-4 text-(--danger-text)">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-(--text-secondary)">
              Recipient
            </p>
            <p className="mt-1 text-(--text)">
              {draft.customer || "No recipient"}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-(--text-secondary)">
              Provider
            </p>
            <p className="mt-1 capitalize text-(--text)">
              {draft.provider}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-(--text-secondary)">
              Tone
            </p>
            <p className="mt-1 capitalize text-(--text)">
              {draft.tone}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-(--text-secondary)">
              Length
            </p>
            <p className="mt-1 capitalize text-(--text)">
              {draft.length}
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-(--border) pt-6">
          <p className="text-sm font-medium text-(--text-secondary)">
            Subject
          </p>
          <p className="mt-1 text-lg font-semibold text-(--text-h)">
            {draft.subject || "Untitled Draft"}
          </p>
        </div>

        <div className="mt-6 border-t border-(--border) pt-6">
          <p className="text-sm font-medium text-(--text-secondary)">
            Reply
          </p>
          <div className="mt-3 rounded-lg border border-(--border) bg-(--surface-hover) p-5">
            <p className="whitespace-pre-wrap leading-7 text-(--text)">
              {draft.reply}
            </p>
          </div>
        </div>

        {draft.createdAt && (
          <p className="mt-6 text-sm text-(--text-secondary)">
            Created {new Date(draft.createdAt).toLocaleString()}
          </p>
        )}

        {draft.sentAt && (
          <p className="mt-1 text-sm text-(--text-secondary)">
            Sent {new Date(draft.sentAt).toLocaleString()}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-(--border) pt-6">
          <button
            type="button"
            onClick={() => navigate("/drafts")}
            className="rounded-lg border border-(--border) px-4 py-2 text-(--text) transition hover:bg-(--surface-hover)"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !canSend}
            className="rounded-lg bg-(--info-text) px-4 py-2 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
