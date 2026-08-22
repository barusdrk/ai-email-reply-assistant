import { useState } from "react";
import DraftCard from "../components/DraftCard.js";
import { useDrafts } from "../hooks/useDrafts.js";
import type { Draft } from "../types/index.js";

export default function Drafts() {
  const {
    drafts,
    loading,
    error,
    removeDraft,
    editDraft,
    submit,
  } = useDrafts();

  const [editingDraft, setEditingDraft] =
    useState<Draft | null>(null);
  const [editedReply, setEditedReply] =
    useState("");
  const [saving, setSaving] =
    useState(false);

  function openEdit(draft: Draft) {
    setEditingDraft(draft);
    setEditedReply(draft.reply);
  }

  function closeEdit() {
    setEditingDraft(null);
    setEditedReply("");
  }

  async function saveEdit() {
    if (!editingDraft?.id || !editedReply.trim()) {
      return;
    }

    try {
      setSaving(true);
      await editDraft(
        editingDraft.id,
        editedReply.trim()
      );
      closeEdit();
    } catch (error) {
      console.error(
        "Failed to update draft:",
        error
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        Loading drafts...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold dark:text-white">
          Draft Replies
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          AI-generated replies waiting for review.
        </p>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          No drafts available.
        </div>
      ) : (
        <div className="grid gap-6">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onOpen={() => {
                console.log("Open", draft.id);
              }}
              onEdit={() => {
                openEdit(draft);
              }}
              onDelete={() => {
                void removeDraft(draft.id);
              }}
            />
          ))}
        </div>
      )}

      {drafts.length > 0 && drafts[0].id && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              void submit(drafts[0].id);
            }}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Submit First Draft For Approval
          </button>
        </div>
      )}

      {editingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="text-xl font-bold dark:text-white">
              Edit Draft Reply
            </h2>

            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {editingDraft.subject}
            </p>

            <textarea
              value={editedReply}
              onChange={(event) => {
                setEditedReply(event.target.value);
              }}
              className="mt-4 min-h-64 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  void saveEdit();
                }}
                disabled={
                  saving ||
                  !editedReply.trim()
                }
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
