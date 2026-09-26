import { useState } from "react";
import ApprovalCard from "../components/ApprovalCard.js";
import { useApprovals } from "../hooks/useApprovals.js";
import { updateDraft } from "../services/drafts.js";
import { submitApproval } from "../services/approval.js";
import type { Approval, Draft } from "../types/index.js";

export default function Approvals() {
  const { approvals, loading, error, approve, reject, refresh } = useApprovals();
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [editedReply, setEditedReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [rejectingApproval, setRejectingApproval] = useState<Approval | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [resubmittingId, setResubmittingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const actionInProgress = saving || rejecting || approvingId !== null || resubmittingId !== null;

  function openEdit(draft: Draft) {
    setActionError("");
    setEditingDraft(draft);
    setEditedReply(draft.reply);
  }

  function closeEdit() {
    if (saving) return;
    setEditingDraft(null);
    setEditedReply("");
  }

  function openReject(approval: Approval) {
    setActionError("");
    setRejectingApproval(approval);
    setRejectionReason("");
  }

  function closeReject() {
    if (rejecting) return;
    setRejectingApproval(null);
    setRejectionReason("");
  }

  async function handleApprove(approvalId: string) {
    try {
      setApprovingId(approvalId);
      setActionError("");
      await approve(approvalId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to approve draft.";
      setActionError(message);
      console.error("Failed to approve draft:", error);
    } finally {
      setApprovingId(null);
    }
  }

  async function saveEdit() {
    if (!editingDraft?.id || !editedReply.trim()) return;
    try {
      setSaving(true);
      setActionError("");
      await updateDraft(editingDraft.id, editedReply.trim());
      await refresh();
      closeEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update draft.";
      setActionError(message);
      console.error("Failed to update draft:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleResubmit(approvalId: string) {
    try {
      setResubmittingId(approvalId);
      setActionError("");
      await submitApproval(approvalId);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to resubmit draft.";
      setActionError(message);
      console.error("Failed to resubmit draft:", error);
    } finally {
      setResubmittingId(null);
    }
  }

  async function submitReject() {
    if (!rejectingApproval?.id) return;
    try {
      setRejecting(true);
      setActionError("");
      await reject(rejectingApproval.id, rejectionReason.trim() || undefined);
      closeReject();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reject draft.";
      setActionError(message);
      console.error("Failed to reject draft:", error);
    } finally {
      setRejecting(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-(--text)">Loading approvals...</div>;
  }

  if (error) {
    return <div className="p-6 text-(--danger-text)">{error}</div>;
  }

  const escalatedCount = approvals.filter((approval) => approval.draft.status === "escalated").length;
  const pendingCount = approvals.filter((approval) => approval.draft.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-(--text-h)">Approval Queue</h1>
        <p className="mt-2 text-(--text-secondary)">Review AI replies before they are sent.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-(--border) bg-(--surface) p-4">
          <p className="text-sm text-(--text-secondary)">Pending Approval</p>
          <p className="mt-1 text-2xl font-bold text-(--text-h)">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-(--danger) bg-(--error-bg) p-4">
          <p className="text-sm text-(--danger-text)">Human Review Required</p>
          <p className="mt-1 text-2xl font-bold text-(--danger-text)">{escalatedCount}</p>
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-(--danger) bg-(--error-bg) p-4 text-sm text-(--danger-text)">
          {actionError}
        </div>
      )}

      {approvals.length === 0 ? (
        <div className="rounded-xl border border-(--border) bg-(--surface) p-8 text-center text-(--text-secondary)">
          No replies waiting for approval.
        </div>
      ) : (
        <div className="grid gap-6">
          {approvals.map((approval) => {
            const draft = approval.draft;
            const escalated = draft.status === "escalated";

            return (
              <div key={approval.id} className="space-y-3">
                <ApprovalCard
                  draft={draft}
                  onApprove={() => void handleApprove(approval.id)}
                  onReject={() => openReject(approval)}
                  onEdit={() => openEdit(draft)}
                  disabled={actionInProgress}
                  approving={approvingId === approval.id}
                />
              </div>
            );
          })}
        </div>
      )}

      {editingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-draft-title"
            className="w-full max-w-2xl rounded-xl border border-(--border) bg-(--surface) p-6 shadow-xl"
          >
            <h2 id="edit-draft-title" className="text-xl font-bold text-(--text-h)">
              Edit Draft Reply
            </h2>
            <p className="mt-2 text-sm text-(--text-secondary)">{editingDraft.subject}</p>
            <textarea
              value={editedReply}
              onChange={(event) => setEditedReply(event.target.value)}
              disabled={saving}
              aria-label="Draft reply"
              className="mt-4 min-h-64 w-full rounded-lg border border-(--input-border) bg-(--input-bg) p-3 text-(--text) outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent) disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="rounded-lg border border-(--border) bg-(--surface) px-4 py-2 text-(--text) hover:bg-(--surface-hover) disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={saving || !editedReply.trim()}
                className="rounded-lg bg-(--accent) px-4 py-2 font-medium text-(--accent-contrast) hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectingApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-draft-title"
            className="w-full max-w-lg rounded-xl border border-(--border) bg-(--surface) p-6 shadow-xl"
          >
            <h2 id="reject-draft-title" className="text-xl font-bold text-(--text-h)">
              Reject Draft
            </h2>
            <p className="mt-2 text-sm text-(--text-secondary)">
              {rejectingApproval.draft.subject}
            </p>
            <p className="mt-4 text-sm text-(--text)">
              Are you sure you want to reject this draft? You can optionally provide a reason for the rejection.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Optional rejection reason..."
              disabled={rejecting}
              aria-label="Rejection reason"
              className="mt-4 min-h-32 w-full rounded-lg border border-(--input-border) bg-(--input-bg) p-3 text-(--text) outline-none placeholder:text-(--text-secondary) focus:border-(--danger) focus:ring-2 focus:ring-(--danger) disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeReject}
                disabled={rejecting}
                className="rounded-lg border border-(--border) bg-(--surface) px-4 py-2 text-(--text) hover:bg-(--surface-hover) disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitReject()}
                disabled={rejecting}
                className="rounded-lg bg-(--danger) px-4 py-2 font-medium text-(--danger-contrast) hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rejecting ? "Rejecting..." : "Reject Draft"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
