import express, {
  type Request,
  type Response,
} from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { connectDatabase } from "./config/database.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import accountsRoutes from "./routes/accounts.js";
import replyRoutes from "./routes/reply.js";
import emailRoutes from "./routes/email.js";
import draftRoutes from "./routes/drafts.js";
import approvalRoutes from "./routes/approvals.js";
import settingsRoutes from "./routes/settings.js";
import profileRoutes from "./routes/profile.js";
import billingRoutes from "./routes/billing.js";
import dashboardRoutes from "./routes/dashboard.js";
import { initializeWebSocket } from "./services/websocket.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "https://ai-email-reply-assistant-client.vercel.app",
];

const corsOptions = {
  origin(
    origin: string | undefined,
    callback: (error: Error | null, success?: boolean) => void
  ) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

const io = new Server(server, {
  cors: corsOptions,
});

initializeWebSocket(io);

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "AI Email Reply Assistant API",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/reply", replyRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/drafts", draftRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/dashboard", dashboardRoutes);

const PORT = Number(process.env.PORT ?? 3001);

async function start() {
  try {
    await connectDatabase();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server.");
    console.error(error);
    process.exit(1);
  }
}

start();
