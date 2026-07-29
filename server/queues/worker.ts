import {
  Worker,
  type Job,
} from "bullmq";

import redis from "../config/redis.js";
import { logger } from "../config/logger.js";
import { createDraft } from "../services/drafts.js";

interface DraftJob {
  userId: string;
  emailId: string;
  subject: string;
  customer: string;
  email: string;
  tone?: "professional" | "friendly" | "formal" | "empathetic";
  length?: "short" | "medium" | "long";
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
        customer: job.data.customer,
        email: job.data.email,
        tone: job.data.tone,
        length: job.data.length,
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
