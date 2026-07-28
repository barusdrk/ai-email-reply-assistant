import {
  emitApproval,
  emitDraft,
  emitInbox,
} from "./websocket.js";

export function notifyInbox(userId: string) {
  emitInbox(userId);
}

export function notifyDraft(id: string) {
  emitDraft(id);
}

export function notifyApproval(id: string) {
  emitApproval(id);
}
