import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { getInbox, getEmail, generateReply } from "../services/email";
import type { Email, ReplyRequest } from "../types";

export function useInbox() {
  const [emails, setEmails] =
    useState<Email[]>([]);

  const [selectedEmail, setSelectedEmail] =
    useState<Email | null>(null);

  const [reply, setReply] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadInbox = useCallback(async () => {
    try {
      setLoading(true);

      const data = await getInbox();

      setEmails(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load inbox."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  async function selectEmail(id: string) {
    try {
      const email = await getEmail(id);
      setSelectedEmail(email);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load email."
      );
    }
  }

  async function createReply(
    request: ReplyRequest
  ) {
    try {
      setLoading(true);

      const result =
        await generateReply(request);

      setReply(result.reply);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate reply."
      );
    } finally {
      setLoading(false);
    }
  }

  return {
    emails,
    selectedEmail,
    reply,
    loading,
    error,
    selectEmail,
    createReply,
    refresh: loadInbox,
  };
}
