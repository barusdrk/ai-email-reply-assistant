import {useCallback,useEffect,useState} from "react";
import type {Approval} from "../types/approval.js";
import {approveApproval,rejectApproval,getApprovals} from "../services/approval.js";

export function useApprovals(){
  const [approvals,setApprovals]=useState<Approval[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const loadApprovals=useCallback(async()=>{
    try{
      setLoading(true);
      setError("");
      const data=await getApprovals();
      const items=Array.isArray(data)?data:data?.approvals??[];
      setApprovals(
        items
          .filter((approval:Approval)=>approval.status==="pending")
          .sort((a:Approval,b:Approval)=>
            new Date(b.requestedAt??0).getTime()-
            new Date(a.requestedAt??0).getTime()
          )
      );
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
