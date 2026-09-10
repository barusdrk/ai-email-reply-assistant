export interface Email {
  _id?: string;
  id?: string;
  from?: string;
  sender?: string;
  customer?: string;
  subject?: string;
  body?: string;
  text?: string;
}

interface EmailCardProps {
  email: Email;
  selected?: boolean;
  onSelect?: (email: Email) => void;
}

export default function EmailCard({ email, selected = false, onSelect }: EmailCardProps) {
  const sender = email.from ?? email.sender ?? email.customer ?? "Unknown sender";
  const body = email.body ?? email.text ?? "";

  return (
    <div className={`rounded-xl border p-4 transition ${selected ? "border-(--accent) bg-(--surface-hover)" : "border-(--border) bg-(--surface)"}`}>
      <button type="button" onClick={() => onSelect?.(email)} className="w-full text-left">
        <div className="mb-2 text-sm font-medium text-(--text-secondary)">{sender}</div>
        <h3 className="mb-2 font-semibold text-(--text-h)">{email.subject || "No subject"}</h3>
        <p className="line-clamp-3 text-sm text-(--text-secondary)">{body}</p>
      </button>
    </div>
  );
}
