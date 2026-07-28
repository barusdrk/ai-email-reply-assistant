import { useState } from "react";

import InboxList, {
  type InboxEmail,
} from "../components/InboxList";

import EmailViewer, {
  type EmailData,
} from "../components/EmailViewer";

import ReplyCard from "../components/ReplyCard";

import ToneSelector, {
  type Tone,
} from "../components/ToneSelector";

import LengthSelector, {
  type ReplyLength,
} from "../components/LengthSelector";

const sampleEmails: InboxEmail[] = [
  {
    id: "1",
    from: "Alice Johnson",
    subject: "Refund request",
    preview:
      "Hello, I would like to request a refund...",
    receivedAt: "10:25",
    unread: true,
  },
  {
    id: "2",
    from: "Bob Smith",
    subject: "Question about pricing",
    preview:
      "Could you explain your enterprise pricing?",
    receivedAt: "09:50",
    unread: false,
  },
];

export default function Inbox() {
  const [selected, setSelected] =
    useState<InboxEmail>();

  const [reply] = useState(
    "Thank you for contacting us. We appreciate your message and will gladly assist you."
  );

  const [tone, setTone] =
    useState<Tone>("friendly");

  const [length, setLength] =
    useState<ReplyLength>("medium");

  const email: EmailData | null = selected
    ? {
        id: selected.id,
        from: selected.from,
        subject: selected.subject,
        receivedAt: selected.receivedAt,
        body: selected.preview,
      }
    : null;

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div>
        <InboxList
          emails={sampleEmails}
          selectedEmailId={selected?.id}
          onSelect={setSelected}
        />
      </div>

      <div className="space-y-6 xl:col-span-2">
        <EmailViewer email={email} />

        <div className="grid gap-4 md:grid-cols-2">
          <ToneSelector
            value={tone}
            onChange={setTone}
          />

          <LengthSelector
            value={length}
            onChange={setLength}
          />
        </div>

        <ReplyCard
          reply={reply}
        />
      </div>
    </div>
  );
}
