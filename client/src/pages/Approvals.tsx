import { useState } from "react";
import ApprovalCard from "../components/ApprovalCard.js";
import { useApprovals } from "../hooks/useApprovals.js";
import { updateDraft } from "../services/drafts.js";
import type { Draft } from "../types/index.js";

export default function Approvals() {
  const {
    approvals,
    loading,
    error,
    approve,
    reject,
    refresh,
  } = useApprovals();

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

      await updateDraft(
        editingDraft.id,
        editedReply.trim()
      );

      await refresh();
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
        Loading approvals...
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
          Approval Queue
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Review AI replies before they are sent.
        </p>
      </div>

      {approvals.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          No replies waiting for approval.
        </div>
      ) : (
        <div className="grid gap-6">
          {approvals.map((draft) => (
            <ApprovalCard
              key={draft.id}
              draft={draft}
              onApprove={() => {
                void approve(draft.id);
              }}
              onReject={() => {
                void reject(draft.id);
              }}
              onEdit={() => {
                openEdit(draft);
              }}
            />
          ))}
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
