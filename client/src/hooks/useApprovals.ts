import { useCallback, useEffect, useState } from "react";
import type { Draft } from "../types/index.js";
import { getDrafts, approveDraft, rejectDraft, updateDraft } from "../services/drafts.js";

export function useApprovals() {
  const [approvals, setApprovals] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadApprovals = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [pending, escalated] = await Promise.all([
        getDrafts("pending"),
        getDrafts("escalated"),
      ]);

      setApprovals(
        [...escalated, ...pending].sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime()
        )
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load approvals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApprovals();
  }, [loadApprovals]);

  async function edit(id: string, reply: string) {
    await updateDraft(id, reply);
    await loadApprovals();
  }

  async function approve(id: string) {
    await approveDraft(id);
    await loadApprovals();
  }

  async function reject(id: string, reason?: string) {
    await rejectDraft(id, reason);
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
