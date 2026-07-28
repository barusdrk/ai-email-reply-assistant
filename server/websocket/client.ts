import { io, type Socket } from "socket.io-client";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../types/socket.js";

export const socket = io(
  process.env.CLIENT_URL!,
  {
    autoConnect: false,
  }
) as Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;
