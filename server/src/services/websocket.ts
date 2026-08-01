import { Server } from "socket.io";

let io: Server;

export function initializeWebSocket(server: any) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
    },
  });
}

export function emitInbox(userId: string) {
  io.to(userId).emit("inbox:update");
}

export function emitDraft(draftId: string) {
  io.emit("draft:update", draftId);
}

export function emitApproval(id: string) {
  io.emit("approval:update", id);
}

export function socket() {
  return io;
}
