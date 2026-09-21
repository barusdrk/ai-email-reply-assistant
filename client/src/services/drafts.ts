import api from "./api.js";
import type {Draft,DraftProvider,DraftStatus} from "../types/draft.js";
import type {ReplyTone} from "../types/settings.js";
import type {ReplyLengthValue} from "../components/LengthSelector.js";

export interface CreateDraftData {
  emailId:string;
  provider:DraftProvider;
  subject:string;
  customer:string;
  reply:string;
  tone?:ReplyTone;
  length?:ReplyLengthValue;
}

type ApiDraft=Draft & {_id?:string};

function normalizeDraft(draft:ApiDraft):Draft{
  return {...draft,id:draft.id??draft._id??""};
}

export async function getDrafts(status?:DraftStatus){
  const response=await api.get<ApiDraft[]>("/drafts",{params:status?{status}:undefined});
  return response.data.map(normalizeDraft);
}

export async function getDraft(id:string){
  const response=await api.get<ApiDraft>(`/drafts/${id}`);
  return normalizeDraft(response.data);
}

export async function createDraft(data:CreateDraftData){
  const response=await api.post<ApiDraft>("/drafts",data);
  return normalizeDraft(response.data);
}

export async function updateDraft(id:string,reply:string){
  const response=await api.put<ApiDraft>(`/drafts/${id}`,{reply});
  return normalizeDraft(response.data);
}

export async function deleteDraft(id:string){
  await api.delete(`/drafts/${id}`);
}

export async function submitForApproval(id:string){
  const response=await api.post<ApiDraft>(`/drafts/${id}/submit`);
  return normalizeDraft(response.data);
}

export async function approveDraft(id:string){
  const response=await api.post<ApiDraft>(`/drafts/${id}/approve`);
  return normalizeDraft(response.data);
}

export async function rejectDraft(id:string,reason?:string){
  const response=await api.post<ApiDraft>(`/drafts/${id}/reject`,{reason});
  return normalizeDraft(response.data);
}

export async function sendDraft(id:string){
  const response=await api.post<ApiDraft>(`/drafts/${id}/send`);
  return normalizeDraft(response.data);
}
