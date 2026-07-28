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

export default function EmailViewer({
  email,
}: EmailViewerProps) {
  if (!email) {
    return (
      <div
        className="
          rounded-lg
          border
          border-dashed
          border-gray-300
          p-8
          text-center
          text-gray-500
          dark:border-gray-700
          dark:text-gray-400
        "
      >
        Select an email from your inbox.
      </div>
    );
  }

  return (
    <section
      className="
        rounded-lg
        border
        border-gray-300
        bg-white
        p-6
        shadow-sm
        dark:border-gray-700
        dark:bg-gray-800
      "
    >
      <header className="mb-6 space-y-2 border-b border-gray-200 pb-4 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {email.subject}
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>From:</strong> {email.from}
        </p>

        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>Received:</strong> {email.receivedAt}
        </p>
      </header>

      <div
        className="
          whitespace-pre-wrap
          break-words
          text-gray-800
          dark:text-gray-100
        "
      >
        {email.body}
      </div>
    </section>
  );
}
