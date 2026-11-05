import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DraftCard from "../components/DraftCard.js";
import { useDrafts } from "../hooks/useDrafts.js";
import type { Draft } from "../types/index.js";

export default function Drafts() {
  const navigate=useNavigate();
  const {drafts,loading,error,removeDraft,editDraft,submit,send}=useDrafts();
  const [editingDraft,setEditingDraft]=useState<Draft|null>(null);
  const [editedReply,setEditedReply]=useState("");
  const [saving,setSaving]=useState(false);
  const [sendingDraftId,setSendingDraftId]=useState<string|null>(null);
  const [submittingDraftId,setSubmittingDraftId]=useState<string|null>(null);
  const [submitError,setSubmitError]=useState("");
  const [sendError,setSendError]=useState("");
  const [editError,setEditError]=useState("");
  function openEdit(draft:Draft){setEditError("");setEditingDraft(draft);setEditedReply(draft.reply);}
  function closeEdit(){if(saving)return;setEditingDraft(null);setEditedReply("");}
  async function saveEdit(){
    if(!editingDraft?.id||!editedReply.trim())return;
    try{setSaving(true);setEditError("");await editDraft(editingDraft.id,editedReply.trim());setEditingDraft(null);setEditedReply("");}
    catch(error){setEditError(error instanceof Error?error.message:"Unable to update this draft.");}
    finally{setSaving(false);}
  }
  async function handleSend(draft:Draft){
    if(!draft.id||draft.status!=="approved")return;
    try{setSendError("");setSendingDraftId(draft.id);await send(draft.id);}
    catch(error){setSendError(error instanceof Error?error.message:"Unable to send this draft.");}
    finally{setSendingDraftId(null);}
  }
  async function handleSubmit(draft:Draft){
    if(!draft.id||draft.status!=="rejected")return;
    try{setSubmitError("");setSubmittingDraftId(draft.id);await submit(draft.id);}
    catch(error){setSubmitError(error instanceof Error?error.message:"Unable to re-evaluate this draft.");}
    finally{setSubmittingDraftId(null);}
  }
  function getStatusMessage(draft:Draft){
    if(draft.status==="pending")return {text:"This draft is waiting for human approval before it can be sent.",className:"border-(--warning) bg-(--warning-bg) text-(--warning-text)"};
    if(draft.status==="escalated")return {text:"This draft requires specialist review before it can be approved or sent.",className:"border-(--danger-text) bg-(--danger-bg) text-(--danger-text)"};
    if(draft.status==="rejected"){
      const reasons=draft.supportPolicyIssues?.length?draft.supportPolicyIssues:draft.automaticActionReasons;
      const text=reasons?.length?"This draft is blocked and must pass support and policy checks before it can enter human approval: "+reasons.join(" "):"This draft was rejected. Re-evaluate it to check whether it can enter human approval.";
      return {text,className:"border-(--border) bg-(--surface-secondary) text-(--text-secondary)"};
    }
    if(draft.status==="approved")return {text:"This draft has been approved and is ready to send.",className:"border-(--success) bg-(--success-bg) text-(--success-text)"};
    if(draft.status==="sent")return {text:"This draft has been sent.",className:"border-(--border) bg-(--surface-secondary) text-(--text-secondary)"};
    return null;
  }
  if(loading)return <div className="p-6 text-(--text)">Loading drafts...</div>;
  if(error)return <div className="p-6 text-(--danger-text)">{error}</div>;
  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div><h1 className="text-3xl font-bold text-(--text-h)">Draft Replies</h1><p className="mt-2 text-(--text-secondary)">AI-generated replies, human-reviewed responses, and approved messages.</p></div>
      {sendError&&<div role="alert" className="rounded-lg border border-(--danger-text) bg-(--danger-bg) p-4 text-sm text-(--danger-text)">{sendError}</div>}
      {submitError&&<div role="alert" className="rounded-lg border border-(--danger-text) bg-(--danger-bg) p-4 text-sm text-(--danger-text)">{submitError}</div>}
      {drafts.length===0?<div className="rounded-xl border border-(--border) bg-(--surface) p-8 text-center text-(--text-secondary)">No drafts available.</div>:(
        <div className="grid min-w-0 max-w-full gap-6">
          {drafts.map(draft=>{
            const statusMessage=getStatusMessage(draft);
            return <div key={draft.id} className="min-w-0 max-w-full space-y-3">
              {statusMessage&&<div className={"rounded-lg border p-4 text-sm "+statusMessage.className}>{statusMessage.text}</div>}
              <DraftCard draft={draft} onOpen={()=>navigate("/drafts/"+draft.id)} onEdit={()=>openEdit(draft)} onSend={()=>void handleSend(draft)} onDelete={()=>void removeDraft(draft.id)} sending={sendingDraftId===draft.id}/>
              {draft.status==="rejected"&&<div className="flex justify-end"><button type="button" onClick={()=>void handleSubmit(draft)} disabled={submittingDraftId!==null||sendingDraftId!==null} className="rounded-lg border border-(--accent) bg-(--surface) px-4 py-2 text-sm font-medium text-(--accent) transition hover:bg-(--surface-hover) disabled:cursor-not-allowed disabled:opacity-60">{submittingDraftId===draft.id?"Re-evaluating...":"Re-evaluate & Submit for Approval"}</button></div>}
            </div>;
          })}
        </div>
      )}
      {editingDraft&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-2xl rounded-xl border border-(--border) bg-(--surface) p-6 shadow-xl">
        <h2 className="text-xl font-bold text-(--text-h)">Edit Draft Reply</h2><p className="mt-2 text-sm text-(--text-secondary)">{editingDraft.subject}</p>
        {editError&&<div role="alert" className="mt-3 rounded-lg border border-(--danger-text) bg-(--danger-bg) p-3 text-sm text-(--danger-text)">{editError}</div>}
        <textarea value={editedReply} onChange={event=>setEditedReply(event.target.value)} disabled={saving} className="mt-4 min-h-64 w-full rounded-lg border border-(--input-border) bg-(--input-bg) p-3 text-(--text) outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent) disabled:cursor-not-allowed disabled:opacity-60"/>
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeEdit} disabled={saving} className="rounded-lg border border-(--border) px-4 py-2 text-(--text) hover:bg-(--surface-hover) disabled:cursor-not-allowed disabled:opacity-60">Cancel</button><button type="button" onClick={()=>void saveEdit()} disabled={saving||!editedReply.trim()} className="rounded-lg bg-(--accent) px-4 py-2 text-(--accent-contrast) hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{saving?"Saving...":"Save Changes"}</button></div>
      </div></div>}
    </div>
  );
}
