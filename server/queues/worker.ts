import { Worker, type Job } from "bullmq";

import redis from "../config/redis.js";
import { logger } from "../config/logger.js";
import { createDraft } from "../services/drafts.js";

interface DraftJob {
  userId: string;
  emailId: string;
  subject: string;
  reply: string;
}

export const worker =
new Worker<DraftJob>(
  "drafts",

  async (
    job: Job<DraftJob>
  ) => {
    await createDraft({
      userId: job.data.userId,
      emailId: job.data.emailId,
      subject: job.data.subject,
      reply: job.data.reply,
    });
  },

  {
    connection: redis,
    concurrency: 5,
  }
);

worker.on(
  "completed",
  job => {
    logger.info(
      `Draft ${job.id} completed`
    );
  }
);

worker.on(
  "failed",
  (
    job,
    error
  ) => {
    logger.error({
      jobId: job?.id,
      error: error.message,
    });
  }
);

export default worker;
