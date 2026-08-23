import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  getInbox,
  getEmail,
  generateReply,
  type ApiEmail,
} from "../services/emails.js";
import type {
  Email,
  ReplyRequest,
} from "../types/index.js";

function mapEmail(
  email: ApiEmail
): Email {
  const id =
    email._id ??
    email.id ??
    "";

  return {
    id,
    userId: "",
    provider:
      email.provider ??
      "gmail",
    messageId: id,
    subject:
      email.subject ??
      "",
    customer:
      email.from ?? "",
    preview:
      email.preview ??
      email.body ??
      "",
    body:
      email.body ??
      "",
    unread:
      email.unread ?? false,
    receivedAt:
      email.receivedAt ??
      email.createdAt ??
      "",
  };
}

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

  const loadInbox = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getInbox();

        setEmails(
          (data.emails ?? []).map(
            mapEmail
          )
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load inbox."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  const selectEmail = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setError("");
        setReply("");

        const email =
          await getEmail(id);

        setSelectedEmail(email);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load email."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createReply = useCallback(
    async (
      request: ReplyRequest
    ) => {
      try {
        setLoading(true);
        setError("");

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
    },
    []
  );

  return {
    emails,
    selectedEmail,
    reply,
    loading,
    error,
    setReply,
    selectEmail,
    createReply,
    refresh: loadInbox,
  };
}
