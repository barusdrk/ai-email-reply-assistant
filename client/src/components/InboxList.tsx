export interface InboxEmail {
  id:string;
  from:string;
  senderName:string;
  senderEmail:string;
  subject:string;
  preview:string;
  body:string;
  receivedAt:string;
  unread:boolean;
  provider:"gmail"|"outlook";
  threadId:string;
}

interface InboxListProps {
  emails:InboxEmail[];
  selectedEmailId?:string;
  onSelect:(email:InboxEmail)=>void;
}

function formatReceivedAt(value:string){
  if(!value)return "";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return value;
  return new Intl.DateTimeFormat(undefined,{
    month:"short",
    day:"numeric",
    hour:"numeric",
    minute:"2-digit",
  }).format(date);
}

function getSender(email:InboxEmail){
  return email.senderName?.trim()||email.senderEmail?.trim()||email.from?.trim()||"Unknown sender";
}

export default function InboxList({emails,selectedEmailId,onSelect}:InboxListProps){
  if(emails.length===0){
    return (
      <div className="rounded-lg border border-dashed border-(--border) p-8 text-center text-(--text-secondary)">
        No emails found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-(--border) bg-(--surface) shadow-sm">
      <ul className="divide-y divide-(--border)">
        {emails.map((email)=>(
          <li key={email.id}>
            <button
              type="button"
              onClick={()=>onSelect(email)}
              className={`w-full p-4 text-left text-(--text) transition hover:bg-(--surface-hover) ${selectedEmailId===email.id?"bg-(--surface-hover)":""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${email.unread?"bg-(--accent)":"bg-transparent"}`} />
                    <h3 className={`truncate font-semibold ${email.unread?"text-(--accent)":"text-(--text-h)"}`}>
                      {getSender(email)}
                    </h3>
                    <span className="shrink-0 rounded-full bg-(--info-bg) px-2 py-0.5 text-xs font-medium text-(--info-text)">
                      {email.provider==="outlook"?"Outlook":"Gmail"}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-sm font-medium text-(--text-h)">
                    {email.subject||"(No subject)"}
                  </p>

                  <p className="mt-1 line-clamp-2 text-sm text-(--text-secondary)">
                    {email.preview||email.body||"No preview available."}
                  </p>
                </div>

                <span className="shrink-0 text-xs text-(--text-secondary)">
                  {formatReceivedAt(email.receivedAt)}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
