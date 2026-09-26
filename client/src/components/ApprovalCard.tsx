import {AlertTriangle,CheckCircle2,Clock} from "lucide-react";
import type {Draft,ConfidenceLevel} from "../types/draft.js";

interface ApprovalCardProps {
  draft:Draft;
  onApprove:()=>void;
  onReject:()=>void;
  onEdit:()=>void;
  disabled?:boolean;
  approving?:boolean;
}

function confidenceClasses(level:ConfidenceLevel){
  if(level==="high")return "bg-(--success-bg) text-(--success-text)";
  if(level==="medium")return "bg-(--warning-bg) text-(--warning-text)";
  return "bg-(--error-bg) text-(--error-text)";
}

function confidenceIcon(level:ConfidenceLevel){
  if(level==="high")return <CheckCircle2 size={15}/>;
  if(level==="medium")return <Clock size={15}/>;
  return <AlertTriangle size={15}/>;
}

export default function ApprovalCard({
  draft,
  onApprove,
  onReject,
  onEdit,
  disabled=false,
  approving=false,
}:ApprovalCardProps){
  const confidence=draft.confidence;
  const escalated=draft.status==="escalated";

  return (
    <article className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-(--text-h)">
            {draft.subject||"Untitled Draft"}
          </h2>
          <p className="mt-1 truncate text-sm text-(--text-secondary)">
            {draft.customer||"No recipient"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded px-3 py-1 text-sm font-medium ${
            escalated
              ?"bg-(--error-bg) text-(--danger-text)"
              :"bg-(--warning-bg) text-(--warning-text)"
          }`}
        >
          {escalated?"Human Review Required":"Pending Approval"}
        </span>
      </div>

      {escalated&&(
        <div className="mt-4 rounded-lg border border-(--danger) bg-(--error-bg) p-3 text-(--danger-text)">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle size={16}/>
            <span>Automatically Escalated</span>
          </div>
          <p className="mt-2 text-sm">
            This reply requires human review before it can be approved.
          </p>
          {draft.escalationReasons&&draft.escalationReasons.length>0&&(
            <ul className="mt-2 space-y-1 text-xs">
              {draft.escalationReasons.map((reason,index)=>(
                <li key={`${reason}-${index}`}>• {reason}</li>
              ))}
            </ul>
          )}
          {draft.escalatedAt&&(
            <p className="mt-2 text-xs">
              Escalated {new Date(draft.escalatedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {confidence&&(
        <div
          className={`mt-4 rounded-lg p-3 ${confidenceClasses(
            confidence.level,
          )}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              {confidenceIcon(confidence.level)}
              <span>AI confidence: {confidence.score}/100</span>
            </div>
            <span className="text-xs font-semibold uppercase">
              {confidence.level}
            </span>
          </div>

          {confidence.level==="low"&&(
            <p className="mt-2 text-sm">
              Human review is strongly recommended before approval.
            </p>
          )}

          {confidence.level==="medium"&&(
            <p className="mt-2 text-sm">
              Review the response carefully before approval.
            </p>
          )}

          {confidence.reasons.length>0&&(
            <ul className="mt-2 space-y-1 text-xs">
              {confidence.reasons.slice(0,3).map((reason,index)=>(
                <li key={`${reason}-${index}`}>• {reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-(--text-secondary)">
          Proposed Reply
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-(--text)">
          {draft.reply}
        </p>
      </div>

      {draft.createdAt&&(
        <p className="mt-4 text-xs text-(--text-secondary)">
          Created {new Date(draft.createdAt).toLocaleString()}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3 border-t border-(--border) pt-4">
        <button
          type="button"
          onClick={onApprove}
          disabled={disabled}
          title={
            escalated
              ?"Approve this escalated draft after human review."
              :undefined
          }
          className="rounded-lg bg-(--success) px-4 py-2 text-sm font-medium text-(--success-contrast) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {approving?"Approving...":"Approve"}
        </button>

        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          className="rounded-lg bg-(--accent) px-4 py-2 text-sm font-medium text-(--accent-contrast) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={onReject}
          disabled={disabled}
          className="rounded-lg bg-(--danger) px-4 py-2 text-sm font-medium text-(--danger-contrast) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </article>
  );
}
