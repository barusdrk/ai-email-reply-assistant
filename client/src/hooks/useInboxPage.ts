import {useCallback,useEffect,useRef,useState} from "react";
import type {InboxEmail} from "../components/InboxList.js";
import type {EmailData} from "../components/EmailViewer.js";
import {getInbox,syncInbox,type ApiEmail} from "../services/emails.js";

const PAGE_SIZE=50;

function mapEmail(email:ApiEmail):InboxEmail{
  const receivedAt=email.receivedAt??email.createdAt??"";
  const from=email.from??"";
  const match=from.match(/^(.*?)\s*<([^<>]+)>$/);
  const senderName=email.senderName?.trim()||(match?match[1].replace(/^["']|["']$/g,"").trim():"");
  const senderEmail=email.senderEmail?.trim()||(match?match[2].trim():from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]??"");

  return {
    id:email._id??email.id??"",
    from,
    senderName,
    senderEmail,
    subject:email.subject??"",
    preview:email.preview??"",
    body:email.body??"",
    receivedAt:receivedAt instanceof Date?receivedAt.toISOString():receivedAt,
    unread:email.unread??false,
    provider:email.provider,
    threadId:email.threadId??"",
  };
}

export function useInboxPage(){
  const [emails,setEmails]=useState<InboxEmail[]>([]);
  const [selected,setSelected]=useState<InboxEmail>();
  const [reply,setReply]=useState("");
  const [loading,setLoading]=useState(true);
  const [syncing,setSyncing]=useState(false);
  const [loadingMore,setLoadingMore]=useState(false);
  const [page,setPage]=useState(1);
  const [hasMore,setHasMore]=useState(false);
  const scrollContainerRef=useRef<HTMLDivElement|null>(null);

  const scrollToTop=useCallback(()=>{
    scrollContainerRef.current?.scrollTo({top:0,behavior:"auto"});
  },[]);

  const loadPage=useCallback(async(nextPage:number,append=false)=>{
    const data=await getInbox(nextPage,PAGE_SIZE);
    const nextEmails=(data.emails??[])
      .map(mapEmail)
      .filter((email)=>Boolean(email.id));

    setEmails((current)=>{
      if(!append)return nextEmails;

      const ids=new Set(current.map((email)=>email.id));

      return [
        ...current,
        ...nextEmails.filter((email)=>!ids.has(email.id)),
      ];
    });

    setPage(data.page??nextPage);
    setHasMore(data.hasMore??false);
  },[]);

  const refresh=useCallback(async()=>{
    setPage(1);
    setHasMore(false);
    await loadPage(1);
    scrollToTop();
  },[loadPage,scrollToTop]);

  const loadMore=useCallback(async()=>{
    if(loading||syncing||loadingMore||!hasMore)return;

    setLoadingMore(true);

    try{
      await loadPage(page+1,true);
    }catch(error){
      console.error("Failed to load more emails:",error);
    }finally{
      setLoadingMore(false);
    }
  },[hasMore,loadPage,loading,loadingMore,page,syncing]);

  const sync=useCallback(async()=>{
    setSyncing(true);
    setLoadingMore(false);

    try{
      await syncInbox();
      await refresh();
    }catch(error){
      console.error("Inbox sync failed:",error);
      await refresh();
    }finally{
      setSyncing(false);
    }
  },[refresh]);

  const handleScroll=useCallback(()=>{
    const container=scrollContainerRef.current;

    if(!container)return;

    const distance=
      container.scrollHeight-
      container.scrollTop-
      container.clientHeight;

    if(distance<=300)void loadMore();
  },[loadMore]);

  const selectEmail=useCallback((email:InboxEmail)=>{
    setSelected(email);
    setReply("");
  },[]);

  useEffect(()=>{
    let cancelled=false;

    async function initialize(){
      setLoading(true);
      setSyncing(true);

      try{
        await syncInbox();

        if(!cancelled){
          await loadPage(1);
          scrollToTop();
        }
      }catch(error){
        console.error("Automatic inbox sync failed:",error);

        if(!cancelled){
          try{
            await loadPage(1);
          }catch(loadError){
            console.error("Failed to load inbox:",loadError);
          }
        }
      }finally{
        if(!cancelled){
          setSyncing(false);
          setLoading(false);
        }
      }
    }

    void initialize();

    return ()=>{
      cancelled=true;
    };
  },[loadPage,scrollToTop]);

  const email:EmailData|null=selected
    ?{
        id:selected.id,
        from:selected.from,
        subject:selected.subject,
        receivedAt:selected.receivedAt,
        body:selected.body,
      }
    :null;

  return {
    emails,
    selected,
    email,
    reply,
    loading,
    syncing,
    loadingMore,
    hasMore,
    scrollContainerRef,
    setReply,
    selectEmail,
    sync,
    handleScroll,
  };
}
