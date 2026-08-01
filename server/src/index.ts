import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.js";
import replyRoutes from "./routes/reply.js";
import emailRoutes from "./routes/email.js";
import draftRoutes from "./routes/drafts.js";
import approvalRoutes from "./routes/approvals.js";
import settingsRoutes from "./routes/settings.js";
import billingRoutes from "./routes/billing.js";

import { initializeWebSocket } from "./services/websocket.js";

dotenv.config();

const app = express();

const server =
  http.createServer(app);

const clientUrl =
  process.env.CLIENT_URL ??
  "http://localhost:5173";

const io =
  new Server(server, {
    cors: {
      origin: clientUrl,
      credentials: true,
    },
  });

initializeWebSocket(io);

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);

app.use(
  express.json()
);

app.get(
  "/",
  (_, res) => {
    res.json({
      message:
        "AI Email Reply Assistant API",
    });
  }
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/reply",
  replyRoutes
);

app.use(
  "/api/emails",
  emailRoutes
);

app.use(
  "/api/drafts",
  draftRoutes
);

app.use(
  "/api/approvals",
  approvalRoutes
);

app.use(
  "/api/settings",
  settingsRoutes
);

app.use(
  "/api/billing",
  billingRoutes
);

const PORT =
  Number(process.env.PORT) || 3001;

server.listen(
  PORT,
  () => {
    console.log(
      `Server running on port ${PORT}`
    );
  }
);
