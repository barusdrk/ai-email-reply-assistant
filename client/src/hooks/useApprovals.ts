import {useCallback,useEffect,useState} from "react";
import type {Approval} from "../types/approval.js";
import type {Draft} from "../types/draft.js";
import {approveApproval,rejectApproval,getApprovals} from "../services/approval.js";

function getId(value:unknown):string{
  if(typeof value==="string")return value;
  if(value&&typeof value==="object"&&"_id" in value){
    const id=(value as {_id?:unknown})._id;
    if(typeof id==="string")return id;
  }
  return "";
}

function getDraft(value:unknown):Draft|null{
  if(!value||typeof value!=="object")return null;
  const draft=value as Draft & {_id?:string};
  const id=draft.id||getId(draft._id);
  if(!id)return null;
  return {
    ...draft,
    id,
  };
}

function normalizeApproval(value:Approval & {_id?:string}):Approval|null{
  const id=value.id||getId(value._id);
  const draft=getDraft(value.draft??value.draftId);
  if(!id||!draft)return null;
  return {
    ...value,
    id,
    draft,
    draftId:draft.id,
  };
}

export function useApprovals(){
  const [approvals,setApprovals]=useState<Approval[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const loadApprovals=useCallback(async()=>{
    try{
      setLoading(true);
      setError("");
      const data=await getApprovals();
      const items:Approval[]=Array.isArray(data)?data:data?.approvals??[];
      const normalized=items
        .filter((approval)=>approval.status==="pending")
        .map((approval)=>normalizeApproval(approval as Approval & {_id?:string}))
        .filter((approval):approval is Approval=>approval!==null)
        .sort((a,b)=>
          new Date(b.requestedAt??0).getTime()-
          new Date(a.requestedAt??0).getTime()
        );
      setApprovals(normalized);
    }catch(error){
      setError(error instanceof Error?error.message:"Unable to load approvals.");
    }finally{
      setLoading(false);
    }
  },[]);

  useEffect(()=>{
    void loadApprovals();
  },[loadApprovals]);

  async function approve(id:string){
    await approveApproval(id);
    await loadApprovals();
  }

  async function reject(id:string,reason?:string){
    await rejectApproval(id,reason);
    await loadApprovals();
  }

  return {
    approvals,
    loading,
    error,
    approve,
    reject,
    refresh:loadApprovals,
  };
}
