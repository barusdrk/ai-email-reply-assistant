import type {Draft} from "./draft.js";

export type ApprovalStatus="pending"|"approved"|"rejected";
export type ApprovalPriority="low"|"medium"|"high";

export interface Approval{
  id:string;
  _id?:string;
  draftId:string|Draft;
  emailId:string;
  requesterId:string;
  reviewerId:string;
  draft:Draft;
  reviewer?:string;
  requestedAt?:string;
  reviewedAt?:string;
  status:ApprovalStatus;
  priority:ApprovalPriority;
  comment?:string;
  reviewedBy?:string;
  createdAt?:string;
  updatedAt?:string;
}
