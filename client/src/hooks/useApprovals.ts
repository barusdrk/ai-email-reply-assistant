import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type { Draft } from "../types.js";

import {
  getDrafts,
  approveDraft,
  rejectDraft,
} from "../services/email.js";

export function useApprovals() {
  const [approvals, setApprovals] =
    useState<Draft[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadApprovals =
    useCallback(async () => {
      try {
        setLoading(true);

        const drafts =
          await getDrafts();

        setApprovals(
          drafts.filter(
            (draft) =>
              draft.status ===
              "pending"
          )
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load approvals."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  async function approve(
    id: string
  ) {
    await approveDraft(id);

    await loadApprovals();
  }

  async function reject(
    id: string
  ) {
    await rejectDraft(id);

    await loadApprovals();
  }

  return {
    approvals,

    loading,

    error,

    approve,

    reject,

    refresh: loadApprovals,
  };
}
