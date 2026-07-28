import { Worker } from "bullmq";
import { redis } from "../config/redis";
import { emailSyncJob } from "../jobs/emailSyncJob";

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
