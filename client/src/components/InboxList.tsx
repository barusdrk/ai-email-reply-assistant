export interface InboxEmail {
  id: string;
  from: string;
  subject: string;
  preview: string;
  receivedAt: string;
  unread: boolean;
}

interface InboxListProps {
  emails: InboxEmail[];
  selectedEmailId?: string;
  onSelect: (email: InboxEmail) => void;
}

export default function InboxList({
  emails,
  selectedEmailId,
  onSelect,
}: InboxListProps) {
  if (emails.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
        No emails found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {emails.map((email) => (
          <li key={email.id}>
            <button
              type="button"
              onClick={() => onSelect(email)}
              className={`w-full p-4 text-left transition hover:bg-gray-100 dark:hover:bg-gray-700 ${
                selectedEmailId === email.id
                  ? "bg-blue-50 dark:bg-blue-900/30"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <h3
                  className={`font-semibold ${
                    email.unread
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {email.subject}
                </h3>

                <span className="text-xs text-gray-500">
                  {email.receivedAt}
                </span>
              </div>

              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                {email.from}
              </p>

              <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                {email.preview}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
