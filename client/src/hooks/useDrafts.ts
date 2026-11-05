import { useCallback, useEffect, useState } from "react";
import type { Draft, DraftProvider } from "../types/index.js";
import {
  getDrafts,
  createDraft,
  updateDraft,
  deleteDraft,
  submitForApproval,
  sendDraft,
} from "../services/drafts.js";

export function useDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDrafts = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError("");
      }
      const loadedDrafts = await getDrafts();
      console.log("[useDrafts] Loaded drafts:", loadedDrafts.length);
      console.log("[useDrafts] Escalated drafts:", loadedDrafts.filter((draft) => draft.status === "escalated"));
      setDrafts(loadedDrafts);
    } catch (err) {
      if (!silent) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load drafts."
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  async function addDraft(
    emailId: string,
    provider: DraftProvider,
    reply: string
  ) {
    await createDraft({
      emailId,
      provider,
      customer: "",
      subject: "",
      reply,
    });
    await loadDrafts();
  }

  async function editDraft(
    draftId: string,
    reply: string
  ) {
    const updatedDraft = await updateDraft(draftId, reply);
    setDrafts((current) => current.map((draft) => draft.id === draftId ? updatedDraft : draft));
    void loadDrafts(true);
  }

  async function removeDraft(draftId: string) {
    await deleteDraft(draftId);
    await loadDrafts();
  }

  async function submit(draftId: string) {
    try {
      await submitForApproval(draftId);
    } finally {
      await loadDrafts();
    }
  }

  async function send(draftId: string) {
    await sendDraft(draftId);
    await loadDrafts();
  }

  return {
    drafts,
    loading,
    error,
    refresh: loadDrafts,
    addDraft,
    editDraft,
    removeDraft,
    submit,
    send,
  };
}
