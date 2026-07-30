import {
  io,
  type Socket,
} from "socket.io-client";

let socket: Socket | null =
  null;

export function connectWebSocket(
  token?: string
) {
  if (socket) {
    return socket;
  }

  socket = io(
    import.meta.env.VITE_API_URL ??
      "http://localhost:3001",
    {
      path: "/socket.io",
      transports: [
        "websocket",
      ],
      auth: {
        token,
      },
    }
  );

  socket.on(
    "connect",
    () => {
      console.log(
        "WebSocket connected:",
        socket?.id
      );
    }
  );

  socket.on(
    "disconnect",
    reason => {
      console.log(
        "WebSocket disconnected:",
        reason
      );
    }
  );

  socket.on(
    "connect_error",
    error => {
      console.error(
        "WebSocket error:",
        error.message
      );
    }
  );

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectWebSocket() {
  socket?.disconnect();

  socket = null;
}
