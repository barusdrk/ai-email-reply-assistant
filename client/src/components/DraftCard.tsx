import { AlertTriangle, CheckCircle2, Clock, Pencil, Send, Trash2 } from "lucide-react";
import type { Draft, ConfidenceLevel } from "../types/draft.js";

interface DraftCardProps {
  draft: Draft;
  onOpen: () => void;
  onEdit: () => void;
  onSend: () => void;
  onDelete: () => void;
  sending?: boolean;
}

function confidenceClasses(level: ConfidenceLevel) {
  if (level === "high") return "bg-(--success-bg) text-(--success-text)";
  if (level === "medium") return "bg-(--warning-bg) text-(--warning-text)";
  return "bg-(--error-bg) text-(--error-text)";
}

function confidenceIcon(level: ConfidenceLevel) {
  if (level === "high") return <CheckCircle2 size={15} />;
  if (level === "medium") return <Clock size={15} />;
  return <AlertTriangle size={15} />;
}

export default function DraftCard({
  draft,
  onOpen,
  onEdit,
  onSend,
  onDelete,
  sending = false,
}: DraftCardProps) {
  const confidence = draft.confidence;
  const lowConfidence = confidence?.level === "low";
  const canSend = draft.status === "approved";

  return (
    <article className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-(--text-h)">
            {draft.subject || "Untitled Draft"}
          </h2>
          <p className="mt-1 truncate text-sm text-(--text-secondary)">
            {draft.customer || "No recipient"}
          </p>
        </div>

        <span
          className={`shrink-0 rounded px-3 py-1 text-sm font-medium capitalize ${
            draft.status === "escalated"
              ? "bg-(--error-bg) text-(--danger-text)"
              : draft.status === "approved"
                ? "bg-(--success-bg) text-(--success-text)"
                : "bg-(--warning-bg) text-(--warning-text)"
          }`}
        >
          {draft.status}
        </span>
      </div>

      {draft.status === "escalated" && (
        <div className="mt-4 rounded-lg border border-(--danger) bg-(--error-bg) p-3 text-(--danger-text)">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle size={16} />
            <span>Human Review Required</span>
          </div>
          <p className="mt-2 text-sm">
            This reply requires human review before it can be approved.
          </p>
          {draft.escalationReasons && draft.escalationReasons.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {draft.escalationReasons.map((reason, index) => (
                <li key={`${reason}-${index}`}>• {reason}</li>
              ))}
            </ul>
          )}
          {draft.escalatedAt && (
            <p className="mt-2 text-xs">
              Escalated {new Date(draft.escalatedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {confidence && (
        <div className={`mt-4 rounded-lg p-3 ${confidenceClasses(confidence.level)}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              {confidenceIcon(confidence.level)}
              <span>AI confidence: {confidence.score}/100</span>
            </div>
            <span className="text-xs font-semibold uppercase">
              {confidence.level}
            </span>
          </div>

          {lowConfidence && (
            <p className="mt-2 text-sm">
              Human review recommended before approval.
            </p>
          )}

          {confidence.reasons.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {confidence.reasons.slice(0, 3).map((reason, index) => (
                <li key={`${reason}-${index}`}>• {reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-4 line-clamp-4 whitespace-pre-wrap text-sm text-(--text)">
        {draft.reply}
      </p>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-(--border) pt-4">
        <button
          type="button"
          onClick={onOpen}
          className="rounded-lg bg-(--accent) px-4 py-2 text-sm font-medium text-(--accent-contrast) transition hover:opacity-90"
        >
          Open
        </button>

        <button
          type="button"
          onClick={onEdit}
          disabled={draft.status === "sent" || sending}
          className="inline-flex items-center gap-2 rounded-lg bg-(--warning) px-4 py-2 text-sm font-medium text-(--text) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pencil size={15} />
          Edit
        </button>

        <button
          type="button"
          onClick={onSend}
          disabled={!canSend || sending}
          title={!canSend ? "Only approved drafts can be sent." : undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-(--success) px-4 py-2 text-sm font-medium text-(--success-contrast) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={15} />
          {sending ? "Sending..." : "Send"}
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-lg bg-(--danger) px-4 py-2 text-sm font-medium text-(--error-text) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 size={15} />
          Delete
        </button>
      </div>
    </article>
  );
}
