import type { Job } from "bullmq";

import { createWorker } from "./createWorker.js";
import { syncInbox } from "../services/email.js";

interface SyncJob {
  userId: string;
}

export const syncWorker =
createWorker<SyncJob>(
  "sync",

  async (
    job: Job<SyncJob>
  ) => {
    await syncInbox(
      "gmail",
      job.data.userId
    );

    await syncInbox(
      "outlook",
      job.data.userId
    );
  }
);
