import express,{type Request,type Response} from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import mongoose from "mongoose";
import {Server} from "socket.io";
import {connectDatabase} from "./config/database.js";
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
import stripeWebhookRoutes from "./routes/stripeWebhook.js";
import dashboardRoutes from "./routes/dashboard.js";
import orderRoutes from "./routes/orders.js";
import knowledgeBaseRoutes from "./routes/knowledgeBase.js";
import {initializeWebSocket} from "./services/websocket.js";
import supportRoutes from "./routes/support.js";
import crmRoutes from "./routes/crm.js";
import automaticActionRoutes from "./routes/automaticActions.js";
import {recoverStaleAutomaticSends} from "./services/automaticSendRecovery.js";
import analyticsRoutes from "./routes/analytics.js";

dotenv.config();

const app=express();
const server=http.createServer(app);
const allowedOrigins=[
  "http://localhost:5173",
  "https://ai-email-reply-assistant-client.vercel.app",
];
const corsOptions={
  origin(origin:string|undefined,callback:(error:Error|null,success?:boolean)=>void){
    if(!origin||allowedOrigins.includes(origin)){
      callback(null,true);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials:true,
};
const io=new Server(server,{cors:corsOptions});
initializeWebSocket(io);

app.use(
  "/api/stripe/webhook",
  express.raw({type:"application/json"}),
  stripeWebhookRoutes,
);
app.use(cors(corsOptions));
app.use(express.json({limit:"10mb"}));

app.get("/",(_req:Request,res:Response)=>{
  res.json({message:"AI Email Reply Assistant API"});
});

app.get("/health",(_req:Request,res:Response)=>{
  const databaseConnected=mongoose.connection.readyState===1;
  res.status(databaseConnected?200:503).json({
    status:databaseConnected?"ok":"error",
    database:databaseConnected?"connected":"disconnected",
  });
});

app.use("/api/auth",authRoutes);
app.use("/api/users",usersRoutes);
app.use("/api/accounts",accountsRoutes);
app.use("/api/reply",replyRoutes);
app.use("/api/email",emailRoutes);
app.use("/api/drafts",draftRoutes);
app.use("/api/approvals",approvalRoutes);
app.use("/api/settings",settingsRoutes);
app.use("/api/profile",profileRoutes);
app.use("/api/billing",billingRoutes);
app.use("/api/dashboard",dashboardRoutes);
app.use("/api/orders",orderRoutes);
app.use("/api/knowledge-base",knowledgeBaseRoutes);
app.use("/api/support",supportRoutes);
app.use("/api/crm",crmRoutes);
app.use("/api/automation",automaticActionRoutes);
app.use("/api/analytics",analyticsRoutes);

const PORT=Number(process.env.PORT??3001);

async function start(){
  try{
    await connectDatabase();
    await runAutomaticSendRecovery();
    const recoveryInterval=setInterval(() => {
      void runAutomaticSendRecovery();
    },AUTOMATIC_SEND_RECOVERY_INTERVAL_MS);
    recoveryInterval.unref?.();
    server.listen(PORT,() => {
      console.log(`Server running on port ${PORT}`);
      console.log("Automatic-send recovery scheduled every 5 minutes.");
    });
  }catch(error){
    console.error("Failed to start server.");
    console.error(error);
    process.exit(1);
  }
}

void start();

const AUTOMATIC_SEND_RECOVERY_INTERVAL_MS=5*60*1000;

async function runAutomaticSendRecovery(){
  try{
    const result=await recoverStaleAutomaticSends();
    console.log("Automatic-send recovery completed:",result);
  }catch(error){
    console.error("Automatic-send recovery failed:",error);
  }
}
