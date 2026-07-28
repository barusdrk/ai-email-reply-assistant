import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";

import { Server } from "socket.io";

import authRoutes from "./routes/auth";
import replyRoutes from "./routes/reply";
import emailRoutes from "./routes/email";
import draftRoutes from "./routes/drafts";
import approvalRoutes from "./routes/approvals";

import { initializeWebSocket } from "./services/websocket";

dotenv.config();

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin:
      process.env.CLIENT_URL ??
      "http://localhost:5173",

    credentials: true,
  },
});

initializeWebSocket(io);

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ??
      "http://localhost:5173",

    credentials: true,
  })
);

app.use(express.json());

app.get("/", (_, res) => {
  res.json({
    message:
      "AI Email Reply Assistant API",
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/reply", replyRoutes);

app.use("/api/emails", emailRoutes);

app.use("/api/drafts", draftRoutes);

app.use(
  "/api/approvals",
  approvalRoutes
);

const PORT =
  Number(process.env.PORT) || 3001;

server.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});
