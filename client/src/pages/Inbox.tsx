import {useEffect,useState} from "react";
import EmailViewer from "../components/EmailViewer.js";
import ReplyCard from "../components/email/ReplyCard.js";
import ReplyGenerator from "../components/email/ReplyGenerator.js";
import ToneSelector,{type SelectedTone} from "../components/ToneSelector.js";
import LengthSelector,{type ReplyLength, type ReplyLengthValue} from "../components/LengthSelector.js";
import InboxActions from "../components/inbox/InboxActions.js";
import InboxPanel from "../components/inbox/InboxPanel.js";
import {useInboxPage} from "../hooks/useInboxPage.js";
import {getSettings} from "../services/settings.js";
import type {ReplyTone} from "../types/settings.js";

export default function Inbox(){
  const inbox=useInboxPage();
  const [defaultReplyTone,setDefaultReplyTone]=useState<ReplyTone>("formal");
  const [defaultLength,setDefaultLength]=useState<ReplyLengthValue>("medium");
  const [tone,setTone]=useState<SelectedTone>("default");
  const [length,setLength]=useState<ReplyLength>("default");

  useEffect(()=>{
    async function loadSettings(){
      try{
        const settings=await getSettings();
        setDefaultReplyTone(settings.defaultReplyTone);
        setDefaultLength(settings.defaultLength as ReplyLengthValue);
      }catch{
        // Keep local defaults.
      }
    }
    void loadSettings();
  },[]);

  const actualTone=tone==="default"?defaultReplyTone:tone;
  const actualLength=length==="default"?defaultLength:length;
  const customer=inbox.selected?.senderEmail?.trim()??"";
  const provider=inbox.selected?.provider;

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start">
        <InboxActions syncing={inbox.syncing} onSync={()=>void inbox.sync()}/>

        <InboxPanel
          emails={inbox.emails}
          selectedEmailId={inbox.selected?.id}
          loading={inbox.loading}
          loadingMore={inbox.loadingMore}
          hasMore={inbox.hasMore}
          scrollContainerRef={inbox.scrollContainerRef}
          onScroll={inbox.handleScroll}
          onSelect={inbox.selectEmail}
        />
      </div>

      <div className="min-w-0 space-y-6 xl:col-span-2">
        <EmailViewer email={inbox.email}/>

        {inbox.selected&&provider&&(
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <ToneSelector
                value={tone}
                onChange={setTone}
                defaultReplyTone={defaultReplyTone}
                useDefault
              />

              <LengthSelector
                value={length}
                onChange={setLength}
                defaultLength={defaultLength}
                useDefault
              />
            </div>

            <ReplyGenerator
              email={inbox.selected.body}
              tone={actualTone}
              length={actualLength}
              onGenerated={inbox.setReply}
            />

            <ReplyCard
              key={inbox.selected.id}
              reply={inbox.reply}
              onChange={inbox.setReply}
              emailId={inbox.selected.id}
              subject={inbox.selected.subject}
              customer={customer}
              provider={provider}
              threadId={inbox.selected.threadId}
              tone={actualTone}
              length={actualLength}
            />
          </>
        )}
      </div>
    </div>
  );
}
