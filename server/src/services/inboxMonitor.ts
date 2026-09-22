import {Types} from "mongoose";
import {connectedAccountRepository} from "../repositories/ConnectedAccountRepository.js";
import {syncGmail, syncOutlook} from "./emailSync.js";

type EmailProvider = "gmail" | "outlook";

interface MonitorResult {
  provider: EmailProvider;
  userId: string;
  success: boolean;
  error?: string;
}

let monitorRunning = false;

async function syncAccount(userId: string, provider: EmailProvider): Promise<MonitorResult> {
  try {
    if (provider === "gmail") await syncGmail(userId);
    else await syncOutlook(userId);
    return {provider, userId, success: true};
  } catch (error) {
    const message = error instanceof Error ? error.message : "Inbox sync failed.";
    console.error(`${provider} inbox monitoring failed for user ${userId}:`, message);
    return {provider, userId, success: false, error: message};
  }
}

export async function monitorConnectedInboxes(): Promise<MonitorResult[]> {
  if (monitorRunning) {
    console.log("Inbox monitor is already running.");
    return [];
  }

  monitorRunning = true;

  try {
    const accounts = await connectedAccountRepository.findConnected();
    const results: MonitorResult[] = [];

    for (const account of accounts) {
      const userId = account.userId?.toString();

      if (!userId || !Types.ObjectId.isValid(userId)) {
        console.error("Skipping connected account with invalid user ID:", account._id);
        continue;
      }

      if (account.provider !== "gmail" && account.provider !== "outlook") {
        continue;
      }

      results.push(await syncAccount(userId, account.provider));
    }

    return results;
  } finally {
    monitorRunning = false;
  }
}

export function startInboxMonitor(intervalMs = 5 * 60 * 1000) {
  if (intervalMs < 30 * 1000) {
    throw new Error("Inbox monitor interval must be at least 30 seconds.");
  }

  let running = false;

  const run = async () => {
    if (running) return;
    running = true;

    try {
      const results = await monitorConnectedInboxes();
      const successful = results.filter((result) => result.success).length;
      const failed = results.filter((result) => !result.success).length;

      if (results.length > 0) {
        console.log("Inbox monitor completed:", {
          accounts: results.length,
          successful,
          failed,
        });
      }
    } catch (error) {
      console.error("Inbox monitor failed:", error);
    } finally {
      running = false;
    }
  };

  void run();

  const timer = setInterval(() => {
    void run();
  }, intervalMs);

  return () => {
    clearInterval(timer);
  };
}
