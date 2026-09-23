import { downloadPdf } from "../utils/downloadPdf.js";
import { downloadDocx } from "../utils/downloadDocx.js";
import type { PolicyCheckResult } from "../services/api.js";

interface ReplyCardProps {
  reply: string;
  policyCheck?: PolicyCheckResult;
  loading?: boolean;
  onApprove?: () => void;
  onSend?: () => void;
}

export default function ReplyCard({ reply, policyCheck, loading = false, onApprove, onSend }: ReplyCardProps) {
  async function copyReply() {
    await navigator.clipboard.writeText(reply);
  }

  const hasViolations = Boolean(policyCheck && policyCheck.violations.length > 0);
  const hasWarnings = Boolean(policyCheck && policyCheck.warnings.length > 0);
  const canProceed = Boolean(policyCheck?.compliant && !hasViolations);

  if (loading) {
    return (
      <div className="rounded-lg border border-(--border) bg-(--surface) p-6 shadow-sm">
        <p className="animate-pulse text-(--text-secondary)">Generating AI reply...</p>
      </div>
    );
  }

  if (!reply) {
    return (
      <div className="rounded-lg border border-dashed border-(--border) p-8 text-center text-(--text-secondary)">
        AI reply will appear here.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-(--border) bg-(--surface) shadow-sm">
      <div className="border-b border-(--border) px-6 py-4">
        <h2 className="text-lg font-semibold text-(--text-h)">AI Reply</h2>
      </div>

      <div className="whitespace-pre-wrap px-6 py-5 text-(--text)">
        {reply}
      </div>

      {policyCheck && (
        <div className="border-t border-(--border) px-6 py-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-(--text)">Policy Check</h3>
              <p className="text-sm text-(--text-secondary)">
                AI-generated reply compliance review.
              </p>
            </div>

            <span className={`rounded-full px-3 py-1 text-sm font-medium ${policyCheck.compliant ? "bg-(--success)/10 text-(--success)" : "bg-(--error)/10 text-(--error)"}`}>
              {policyCheck.compliant ? "Passed" : "Failed"} · {policyCheck.score}/100
            </span>
          </div>

          {policyCheck.violations.length > 0 && (
            <div className="mb-4 rounded-lg border border-(--error)/30 bg-(--error)/5 p-4">
              <h4 className="mb-2 font-medium text-(--error)">Policy violations</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-(--text)">
                {policyCheck.violations.map((violation, index) => (
                  <li key={`${violation}-${index}`}>{violation}</li>
                ))}
              </ul>
            </div>
          )}

          {policyCheck.warnings.length > 0 && (
            <div className="mb-4 rounded-lg border border-(--warning)/30 bg-(--warning)/5 p-4">
              <h4 className="mb-2 font-medium text-(--warning)">Warnings</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-(--text)">
                {policyCheck.warnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {policyCheck.suggestions.length > 0 && (
            <div className="rounded-lg border border-(--border) bg-(--bg-secondary) p-4">
              <h4 className="mb-2 font-medium text-(--text)">Suggestions</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-(--text-secondary)">
                {policyCheck.suggestions.map((suggestion, index) => (
                  <li key={`${suggestion}-${index}`}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 border-t border-(--border) px-6 py-4">
        <button
          type="button"
          onClick={copyReply}
          className="rounded bg-(--accent) px-4 py-2 text-(--accent-contrast) hover:opacity-90"
        >
          Copy
        </button>

        <button
          type="button"
          onClick={() => downloadPdf({ customerEmail: "", reply })}
          className="rounded bg-(--bg-secondary) px-4 py-2 text-(--text) hover:bg-(--surface-hover)"
        >
          Download PDF
        </button>

        <button
          type="button"
          onClick={() => downloadDocx({ customerEmail: "", reply })}
          className="rounded bg-(--bg-secondary) px-4 py-2 text-(--text) hover:bg-(--surface-hover)"
        >
          Download DOCX
        </button>

        {onApprove && (
          <button
            type="button"
            onClick={onApprove}
            disabled={Boolean(policyCheck && !canProceed)}
            className="rounded bg-(--success) px-4 py-2 text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve
          </button>
        )}

        {onSend && (
          <button
            type="button"
            onClick={onSend}
            disabled={Boolean(policyCheck && !canProceed)}
            className="rounded bg-(--info-text) px-4 py-2 text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send Email
          </button>
        )}
      </div>

      {hasViolations && (
        <div className="border-t border-(--border) px-6 py-3 text-sm text-(--error)">
          Approval and sending are disabled until the policy violations are resolved.
        </div>
      )}

      {hasWarnings && !hasViolations && (
        <div className="border-t border-(--border) px-6 py-3 text-sm text-(--warning)">
          This reply contains warnings. Review them before approving or sending.
        </div>
      )}
    </div>
  );
}
