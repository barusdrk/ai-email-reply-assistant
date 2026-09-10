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

  const loadDrafts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setDrafts(await getDrafts());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load drafts."
      );
    } finally {
      setLoading(false);
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
    await updateDraft(draftId, reply);
    await loadDrafts();
  }

  async function removeDraft(draftId: string) {
    await deleteDraft(draftId);
    await loadDrafts();
  }

  async function submit(draftId: string) {
    await submitForApproval(draftId);
    await loadDrafts();
  }

  async function send(draftId: string) {
    await sendDraft(draftId);
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
