import type { Draft } from "../types/draft";

interface ApprovalCardProps {
  draft: Draft;

  onApprove: () => void;

  onReject: () => void;

  onEdit: () => void;
}

export default function ApprovalCard({
  draft,
  onApprove,
  onReject,
  onEdit,
}: ApprovalCardProps) {
  return (
    <div className="rounded-xl border border-gray-300 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold dark:text-white">
            {draft.subject}
          </h2>

          <p className="text-sm text-gray-500">
            {draft.customer}
          </p>
        </div>

        <span className="rounded bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">
          Pending Approval
        </span>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
        {draft.reply}
      </p>

      <p className="mt-4 text-sm text-gray-500">
        Created {draft.createdAt}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onApprove}
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          Approve
        </button>

        <button
          onClick={onEdit}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Edit
        </button>

        <button
          onClick={onReject}
          className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
