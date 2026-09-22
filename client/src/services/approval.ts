import api from "./api.js";

export async function approveApproval(id:string){
  const response=await api.patch(`/approvals/${id}/approve`);
  return response.data;
}

export async function rejectApproval(id:string,comment?:string){
  const response=await api.patch(`/approvals/${id}/reject`,{
    comment:comment?.trim()||undefined,
  });
  return response.data;
}

export async function submitApproval(id:string){
  const response=await api.patch(`/approvals/${id}/submit`);
  return response.data;
}

export async function getApprovals(){
  const response=await api.get("/approvals");
  return response.data;
}

export async function getApproval(id:string){
  const response=await api.get(`/approvals/${id}`);
  return response.data;
}
