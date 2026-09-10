import { useState } from "react";
import { createDraft } from "../../services/drafts.js";
import { sendEmail, type SendEmailProvider } from "../../services/emails.js";
import { downloadPdf } from "../../utils/downloadPdf.js";
import { downloadDocx } from "../../utils/downloadDocx.js";
import type { ReplyTone } from "../../types/settings.js";
import type { ReplyLengthValue } from "../LengthSelector.js";

interface Props {
  reply: string;
  onChange?: (value: string) => void;
  emailId: string;
  subject: string;
  customer: string;
  provider: SendEmailProvider;
  threadId?: string;
  tone?: ReplyTone;
  length?: ReplyLengthValue;
}

export default function ReplyCard({
  reply,
  onChange,
  emailId,
  subject,
  customer,
  provider,
  threadId,
  tone = "formal",
  length = "medium",
}: Props) {
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const hasReply = Boolean(reply.trim());
  const hasCustomer = Boolean(customer.trim());

  async function handleCopy() {
    if (!hasReply) {
      setMessage("Generate a reply before copying.");
      return;
    }

    try {
      await navigator.clipboard.writeText(reply);
      setMessage("Reply copied to clipboard.");
    } catch {
      setMessage("Failed to copy reply.");
    }
  }

  async function handleSaveDraft() {
    if (!hasReply) {
      setMessage("Generate a reply before saving a draft.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await createDraft({
        emailId,
        provider,
        subject,
        customer,
        reply: reply.trim(),
        tone,
        length,
      });

      setMessage("Draft saved successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save draft."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSendEmail() {
    if (sending || saving) {
      return;
    }

    if (!hasReply) {
      setMessage("Generate a reply before sending.");
      return;
    }

    if (!hasCustomer) {
      setMessage("Unable to determine the recipient email address.");
      return;
    }

    setSending(true);
    setMessage("");

    try {
      const result = await sendEmail({
        provider,
        to: customer.trim(),
        subject,
        body: reply.trim(),
        emailId,
        threadId,
      });

      if (provider === "sample") {
        setMessage(
          `Email sent successfully via ${result.provider === "gmail" ? "Gmail" : "Outlook"}.`
        );
      } else {
        setMessage("Email sent successfully.");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to send email."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-(--text-h)">
          Generated Reply
        </h2>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleSaveDraft()}
            disabled={saving || sending || !hasReply}
            className="rounded-lg bg-(--accent) px-4 py-2 text-sm font-medium text-(--accent-contrast) transition hover:bg-(--accent-hover) disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            onClick={() => void handleSendEmail()}
            onMouseDown={(event) => event.currentTarget.blur()}
            disabled={saving || sending || !hasReply || !hasCustomer}
            className="rounded-lg bg-(--info-text) px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>

      <textarea
        value={reply}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder="Generated reply will appear here..."
        rows={10}
        className="min-h-48 w-full resize-y rounded-lg border border-(--input-border) bg-(--input-bg) p-4 text-sm text-(--text) outline-none placeholder:text-(--placeholder) focus:ring-2 focus:ring-(--accent)"
      />

      {!hasReply && (
        <p className="mt-3 text-sm text-(--text-secondary)">
          Generate a reply to enable Save Draft and Send Email.
        </p>
      )}

      {hasReply && provider === "sample" && (
        <p className="mt-3 text-sm text-(--text-secondary)">
          This is a sample email. It will be sent using your connected Gmail or Outlook account.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleCopy()}
          disabled={!hasReply}
          className="rounded-lg bg-(--bg-secondary) px-4 py-2 text-sm font-medium text-(--text) transition hover:bg-(--surface-hover) disabled:cursor-not-allowed disabled:opacity-50"
        >
          Copy
        </button>

        <button
          type="button"
          disabled={!hasReply}
          onClick={() =>
            void downloadPdf({
              customerEmail: customer,
              reply,
            })
          }
          className="rounded-lg bg-(--bg-secondary) px-4 py-2 text-sm font-medium text-(--text) transition hover:bg-(--surface-hover) disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download PDF
        </button>

        <button
          type="button"
          disabled={!hasReply}
          onClick={() =>
            void downloadDocx({
              customerEmail: customer,
              reply,
            })
          }
          className="rounded-lg bg-(--bg-secondary) px-4 py-2 text-sm font-medium text-(--text) transition hover:bg-(--surface-hover) disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download DOCX
        </button>
      </div>

      {message && (
        <p className="mt-3 text-sm text-(--text-secondary)">
          {message}
        </p>
      )}
    </section>
  );
}
