import DraftCard from "../components/DraftCard";

import { useDrafts } from "../hooks/useDrafts";

export default function Drafts() {
  const {
    drafts,
    loading,
    error,
    removeDraft,
    editDraft,
    submit,
  } = useDrafts();

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
              onOpen={() =>
                console.log(
                  "Open",
                  draft.id
                )
              }
              onEdit={() =>
                editDraft(
                  draft.id,
                  draft.reply
                )
              }
              onDelete={() =>
                removeDraft(
                  draft.id
                )
              }
            />
          ))}
        </div>
      )}

      {drafts.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() =>
              submit(
                drafts[0].id
              )
            }
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Submit First Draft For Approval
          </button>
        </div>
      )}
    </div>
  );
}
