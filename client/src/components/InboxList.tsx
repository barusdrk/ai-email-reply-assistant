export interface InboxEmail {
  id: string;
  from: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  preview: string;
  body: string;
  receivedAt: string;
  unread: boolean;
  provider: "gmail" | "outlook" | "sample";
  threadId: string;
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
      <div className="rounded-lg border border-dashed border-(--border) p-8 text-center text-(--text-secondary)">
        No emails found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-(--border) bg-(--surface) shadow-sm">
      <ul className="divide-y divide-(--border)">
        {emails.map((email) => (
          <li key={email.id}>
            <button
              type="button"
              onClick={() => onSelect(email)}
              className={`w-full p-4 text-left text-(--text) transition hover:bg-(--surface-hover) ${
                selectedEmailId === email.id ? "bg-(--surface-hover)" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <h3
                    className={`truncate font-semibold ${
                      email.unread ? "text-(--accent)" : "text-(--text-h)"
                    }`}
                  >
                    {email.subject || "(No subject)"}
                  </h3>

                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      email.provider === "outlook"
                        ? "bg-(--info-bg) text-(--info-text)"
                        : "bg-(--info-bg) text-(--info-text)"
                    }`}
                  >
                    {email.provider === "outlook" ? "Outlook" : "Gmail"}
                  </span>
                </div>

                <span className="shrink-0 text-xs text-(--text-secondary)">
                  {email.receivedAt}
                </span>
              </div>

              <p className="mt-1 truncate text-sm text-(--text)">
                {email.from}
              </p>

              <p className="mt-2 line-clamp-2 text-sm text-(--text-secondary)">
                {email.preview}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
