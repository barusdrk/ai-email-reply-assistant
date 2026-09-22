import {useCallback,useEffect,useState} from "react";
import {RefreshCw,Send,Mail,ChevronDown} from "lucide-react";
import {getSentEmails,syncSentEmails,type SentEmail} from "../services/api.js";

function formatDate(value:string){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "";
  return date.toLocaleString(undefined,{
    year:"numeric",
    month:"short",
    day:"numeric",
    hour:"2-digit",
    minute:"2-digit",
  });
}

function recipientLabel(email:SentEmail){
  if(email.recipientName?.trim())return `${email.recipientName} <${email.recipientEmail??""}>`;
  return email.recipientEmail||email.from||"Unknown recipient";
}

export default function Sent(){
  const [emails,setEmails]=useState<SentEmail[]>([]);
  const [loading,setLoading]=useState(true);
  const [syncing,setSyncing]=useState(false);
  const [error,setError]=useState("");
  const [selected,setSelected]=useState<SentEmail|null>(null);

  const loadEmails=useCallback(async()=>{
    try{
      setError("");
      const result=await getSentEmails(1,50);
      setEmails(result.emails);
    }catch(error){
      setError(error instanceof Error?error.message:"Failed to load sent emails.");
    }finally{
      setLoading(false);
    }
  },[]);

  const handleSync=async()=>{
    try{
      setSyncing(true);
      setError("");
      await syncSentEmails();
      await loadEmails();
    }catch(error){
      setError(error instanceof Error?error.message:"Failed to synchronize sent emails.");
    }finally{
      setSyncing(false);
    }
  };

  useEffect(()=>{
    void loadEmails();
  },[loadEmails]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-(--text-h)">Sent Emails</h1>
          <p className="mt-2 text-(--text-secondary)">
            Emails sent from your connected Gmail and Outlook accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-(--border) px-4 py-2 text-sm font-medium text-(--text-h) transition hover:bg-(--bg-secondary) disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={syncing?"h-4 w-4 animate-spin":"h-4 w-4"}/>
          {syncing?"Syncing...":"Sync Sent"}
        </button>
      </div>

      {error&&(
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-(--border) bg-(--surface)">
        {loading?(
          <div className="flex items-center justify-center px-6 py-16 text-sm text-(--text-secondary)">
            Loading sent emails...
          </div>
        ):emails.length===0?(
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <Send className="h-10 w-10 text-(--text-secondary)"/>
            <h2 className="mt-4 text-lg font-semibold text-(--text-h)">No sent emails</h2>
            <p className="mt-2 max-w-md text-sm text-(--text-secondary)">
              Sent emails from your connected accounts will appear here after synchronization.
            </p>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-(--accent) px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              <RefreshCw className={syncing?"h-4 w-4 animate-spin":"h-4 w-4"}/>
              Sync Sent Emails
            </button>
          </div>
        ):(
          <div className="divide-y divide-(--border)">
            {emails.map((email)=>(
              <button
                key={email._id}
                type="button"
                onClick={()=>setSelected(selected?._id===email._id?null:email)}
                className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-(--bg-secondary)"
              >
                <div className="mt-1 rounded-full bg-(--bg-secondary) p-2">
                  <Mail className="h-4 w-4 text-(--text-secondary)"/>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="truncate text-sm font-semibold text-(--text-h)">
                      To: {recipientLabel(email)}
                    </p>
                    <span className="shrink-0 text-xs text-(--text-secondary)">
                      {formatDate(email.receivedAt)}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-sm font-medium text-(--text-h)">
                    {email.subject||"(No subject)"}
                  </p>

                  <p className="mt-1 line-clamp-2 text-sm text-(--text-secondary)">
                    {email.preview||email.body||"(No message content)"}
                  </p>

                  <div className="mt-2 flex items-center gap-2 text-xs text-(--text-secondary)">
                    <span className="rounded-full bg-(--bg-secondary) px-2 py-1 uppercase">
                      {email.provider}
                    </span>
                    <ChevronDown className={selected?._id===email._id?"h-3.5 w-3.5 rotate-180":"h-3.5 w-3.5"}/>
                  </div>

                  {selected?._id===email._id&&(
                    <div className="mt-4 rounded-lg border border-(--border) bg-(--bg) p-4">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-(--text-h)">
                        {email.body||email.preview||"(No message content)"}
                      </p>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
