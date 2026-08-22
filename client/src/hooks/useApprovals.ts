import {
  useCallback,
  useEffect,
  useState,
} from "react";
import type { Draft } from "../types/index.js";
import {
  getDrafts,
  approveDraft,
  rejectDraft,
  updateDraft,
} from "../services/drafts.js";

export function useApprovals() {
  const [approvals, setApprovals] =
    useState<Draft[]>([]);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");

  const loadApprovals = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const drafts =
          await getDrafts();

        setApprovals(
          drafts.filter(
            (draft) =>
              draft.status === "pending"
          )
        );
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load approvals."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadApprovals();
  }, [loadApprovals]);

  async function edit(
    id: string,
    reply: string
  ) {
    await updateDraft(id, reply);
    await loadApprovals();
  }

  async function approve(id: string) {
    await approveDraft(id);
    await loadApprovals();
  }

  async function reject(id: string) {
    await rejectDraft(id);
    await loadApprovals();
  }

  return {
    approvals,
    loading,
    error,
    edit,
    approve,
    reject,
    refresh: loadApprovals,
  };
}
