import ReplyGenerator from "./ReplyGenerator.js";

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

export default function EmailCard({
  email,
  selected = false,
  onSelect,
}: EmailCardProps) {
  const sender =
    email.from ??
    email.sender ??
    email.customer ??
    "Unknown sender";

  const body =
    email.body ??
    email.text ??
    "";

  return (
    <div
      className={`rounded-xl border p-4 transition ${
        selected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect?.(email)}
        className="w-full text-left"
      >
        <div className="mb-2 text-sm font-medium text-gray-500">
          {sender}
        </div>

        <h3 className="mb-2 font-semibold">
          {email.subject || "No subject"}
        </h3>

        <p className="line-clamp-3 text-sm text-gray-600">
          {body}
        </p>
      </button>
    </div>
  );
}
