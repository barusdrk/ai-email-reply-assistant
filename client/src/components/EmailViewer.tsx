export interface EmailData {
  id: string;
  from: string;
  subject: string;
  receivedAt: string;
  body: string;
}

interface EmailViewerProps {
  email: EmailData | null;
}

export default function EmailViewer({ email }: EmailViewerProps) {
  if (!email) {
    return (
      <div className="rounded-lg border border-dashed border-(--border) p-8 text-center text-(--text-secondary)">
        Select an email from your inbox.
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-(--border) bg-(--surface) p-6 shadow-sm">
      <header className="mb-6 space-y-2 border-b border-(--border) pb-4">
        <h2 className="text-xl font-semibold text-(--text-h)">
          {email.subject}
        </h2>
        <p className="text-sm text-(--text-secondary)">
          <strong>From:</strong> {email.from}
        </p>
        <p className="text-sm text-(--text-secondary)">
          <strong>Received:</strong> {email.receivedAt}
        </p>
      </header>
      <div className="whitespace-pre-wrap wrap-break-words text-(--text)">
        {email.body}
      </div>
    </section>
  );
}
