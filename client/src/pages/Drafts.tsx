import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DraftCard from "../components/DraftCard.js";
import { useDrafts } from "../hooks/useDrafts.js";
import type { Draft } from "../types/index.js";

export default function Drafts() {
  const navigate = useNavigate();
  const { drafts, loading, error, removeDraft, editDraft, submit, send } = useDrafts();
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [editedReply, setEditedReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingDraftId, setSendingDraftId] = useState<string | null>(null);
  const [submittingDraftId, setSubmittingDraftId] = useState<string | null>(null);

  function openEdit(draft: Draft) {
    setEditingDraft(draft);
    setEditedReply(draft.reply);
  }

  function closeEdit() {
    if (saving) return;
    setEditingDraft(null);
    setEditedReply("");
  }

  async function saveEdit() {
    if (!editingDraft?.id || !editedReply.trim()) return;

    try {
      setSaving(true);
      await editDraft(editingDraft.id, editedReply.trim());
      closeEdit();
    } catch (error) {
      console.error("Failed to update draft:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleSend(draft: Draft) {
    if (!draft.id || draft.status !== "approved") return;

    try {
      setSendingDraftId(draft.id);
      await send(draft.id);
    } catch (error) {
      console.error("Failed to send draft:", error);
    } finally {
      setSendingDraftId(null);
    }
  }

  async function handleSubmit(draft: Draft) {
    if (!draft.id || draft.status !== "rejected") return;

    try {
      setSubmittingDraftId(draft.id);
      await submit(draft.id);
    } catch (error) {
      console.error("Failed to submit draft for approval:", error);
    } finally {
      setSubmittingDraftId(null);
    }
  }

  if (loading) {
    return <div className="p-6 text-(--text)">Loading drafts...</div>;
  }

  if (error) {
    return <div className="p-6 text-(--danger-text)">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-(--text-h)">Draft Replies</h1>
        <p className="mt-2 text-(--text-secondary)">
          AI-generated replies and approved responses.
        </p>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-xl border border-(--border) bg-(--surface) p-8 text-center text-(--text-secondary)">
          No drafts available.
        </div>
      ) : (
        <div className="grid gap-6">
          {drafts.map((draft) => (
            <div key={draft.id} className="space-y-3">
              <DraftCard
                draft={draft}
                onOpen={() => navigate(`/drafts/${draft.id}`)}
                onEdit={() => openEdit(draft)}
                onSend={() => void handleSend(draft)}
                onDelete={() => void removeDraft(draft.id)}
                sending={sendingDraftId === draft.id}
              />

              {draft.status === "rejected" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleSubmit(draft)}
                    disabled={submittingDraftId !== null || sendingDraftId !== null}
                    className="rounded-lg border border-(--accent) bg-(--surface) px-4 py-2 text-sm font-medium text-(--accent) transition hover:bg-(--surface-hover) disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingDraftId === draft.id
                      ? "Submitting..."
                      : "Resubmit for Approval"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-(--border) bg-(--surface) p-6 shadow-xl">
            <h2 className="text-xl font-bold text-(--text-h)">Edit Draft Reply</h2>
            <p className="mt-2 text-sm text-(--text-secondary)">
              {editingDraft.subject}
            </p>

            <textarea
              value={editedReply}
              onChange={(event) => setEditedReply(event.target.value)}
              disabled={saving}
              className="mt-4 min-h-64 w-full rounded-lg border border-(--input-border) bg-(--input-bg) p-3 text-(--text) outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent) disabled:cursor-not-allowed disabled:opacity-60"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="rounded-lg border border-(--border) px-4 py-2 text-(--text) hover:bg-(--surface-hover) disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={saving || !editedReply.trim()}
                className="rounded-lg bg-(--accent) px-4 py-2 text-(--accent-contrast) hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
