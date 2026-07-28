import { Worker } from "bullmq";
import { redis } from "../config/redis.js";
import { emailSyncJob } from "../jobs/emailSyncJob.js";

new Worker(
  "emails",
  async job => {
    if (job.name === "sync") {
      await emailSyncJob(
        job.data.userId
      );
    }
  },
  {
    connection: redis,
  }
);
