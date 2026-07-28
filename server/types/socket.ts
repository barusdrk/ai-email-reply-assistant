import type { DraftRecord } from "./draft.js";
import type { ApprovalStatus } from "./approval.js";
import type { EmailRecord } from "./email.js";
import type { NotificationType } from "./notification.js";

export interface NotificationPayload {
  id:string;
  type:NotificationType;
  title:string;
  message:string;
  referenceId?:string;
  createdAt:string;
}

export interface InboxSyncPayload {
  provider:"gmail"|"outlook";
  count:number;
  emails?:EmailRecord[];
}

export interface DraftReadyPayload {
  draft:DraftRecord;
}

export interface ApprovalPayload {
  draftId:string;
  status:ApprovalStatus;
  reviewerId:string;
  comment?:string;
}

export interface ServerToClientEvents {
  notification:(payload:NotificationPayload)=>void;

  "draft:ready":(
    payload:DraftReadyPayload
  )=>void;

  "approval:update":(
    payload:ApprovalPayload
  )=>void;

  "inbox:sync":(
    payload:InboxSyncPayload
  )=>void;

  "email:deleted":(
    id:string
  )=>void;

  "email:updated":(
    email:EmailRecord
  )=>void;

  "draft:deleted":(
    id:string
  )=>void;

  "system:error":(
    message:string
  )=>void;
}

export interface ClientToServerEvents {
  "inbox:sync":()=>void;

  "draft:generate":(
    emailId:string
  )=>void;

  "draft:approve":(
    approvalId:string
  )=>void;

  ping:()=>void;
}

export interface InterServerEvents {}

export interface SocketData {
  userId:string;
}
