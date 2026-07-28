import type { Server } from "socket.io";

let io: Server | null = null;

export function initializeWebSocket(
  socketServer: Server
) {
  io = socketServer;

  io.on("connection", (socket) => {
    console.log(
      "Client connected:",
      socket.id
    );

    socket.on(
      "disconnect",
      () => {
        console.log(
          "Client disconnected:",
          socket.id
        );
      }
    );
  });
}

export function notifyDraftCreated(
  draft: unknown
) {
  io?.emit(
    "draft-created",
    draft
  );
}

export function notifyDraftUpdated(
  draft: unknown
) {
  io?.emit(
    "draft-updated",
    draft
  );
}

export function notifyApproval(
  draft: unknown
) {
  io?.emit(
    "draft-approved",
    draft
  );
}

export function notifyRejection(
  draft: unknown
) {
  io?.emit(
    "draft-rejected",
    draft
  );
}

export function notifySent(
  draft: unknown
) {
  io?.emit(
    "email-sent",
    draft
  );
}
