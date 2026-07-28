import type { Draft } from "../types";

interface DraftCardProps {
  draft: Draft;

  onOpen: () => void;

  onEdit: () => void;

  onDelete: () => void;
}

export default function DraftCard({
  draft,
  onOpen,
  onEdit,
  onDelete,
}: DraftCardProps) {
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

        <span className="rounded bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
          {draft.status}
        </span>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
        {draft.reply}
      </p>

      <p className="mt-4 text-sm text-gray-500">
        Created {draft.createdAt}
      </p>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onOpen}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Open
        </button>

        <button
          onClick={onEdit}
          className="rounded bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700"
        >
          Edit
        </button>

        <button
          onClick={onDelete}
          className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
