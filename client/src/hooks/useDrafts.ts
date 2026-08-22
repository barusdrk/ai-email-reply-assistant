import {
  useCallback,
  useEffect,
  useState,
} from "react";
import type { Draft } from "../types/index.js";
import {
  getDrafts,
  createDraft,
  updateDraft,
  deleteDraft,
  submitForApproval,
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
    reply: string
  ) {
    await createDraft({
      emailId,
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

  return {
    drafts,
    loading,
    error,
    refresh: loadDrafts,
    addDraft,
    editDraft,
    removeDraft,
    submit,
  };
}
