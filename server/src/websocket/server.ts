import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  NotificationPayload,
  DraftReadyPayload,
  ApprovalPayload,
  InboxSyncPayload,
} from "../types/socket.js";

let io:Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function initWebSocket(
  server:HttpServer
){
  io=new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server,{
    cors:{
      origin:process.env.CLIENT_URL,
      credentials:true,
    },
  });

  // JWT middleware...

  return io;
}

export function emitNotification(
  userId:string,
  payload:NotificationPayload
){
  io.to(userId).emit(
    "notification",
    payload
  );
}

export function emitDraftReady(
  userId:string,
  payload:DraftReadyPayload
){
  io.to(userId).emit(
    "draft:ready",
    payload
  );
}

export function emitApprovalUpdate(
  userId:string,
  payload:ApprovalPayload
){
  io.to(userId).emit(
    "approval:update",
    payload
  );
}

export function emitInboxSync(
  userId:string,
  payload:InboxSyncPayload
){
  io.to(userId).emit(
    "inbox:sync",
    payload
  );
}
