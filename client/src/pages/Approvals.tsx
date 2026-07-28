import ApprovalCard from "../components/ApprovalCard.js";

import { useApprovals } from "../hooks/useApprovals.js";

export default function Approvals() {
  const {
    approvals,
    loading,
    error,
    approve,
    reject,
  } = useApprovals();

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
              onApprove={() =>
                approve(
                  draft.id
                )
              }
              onReject={() =>
                reject(
                  draft.id
                )
              }
              onEdit={() =>
                console.log(
                  "Edit",
                  draft.id
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
