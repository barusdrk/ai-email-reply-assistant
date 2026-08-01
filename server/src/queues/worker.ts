import {
  Worker,
  type Job,
} from "bullmq";

import redis from "../config/redis.js";
import { logger } from "../config/logger.js";

interface DraftJob {
  userId:string;
  draftId:string;
}

export function createDraftWorker() {
  if (!redis) {
    logger.warn(
      "Redis disabled. Worker not started."
    );

    return null;
  }

  const worker =
    new Worker<DraftJob>(
      "draft",
      async (
        job: Job<DraftJob>
      ) => {
        logger.info({
          jobId:
            job.id,
          data:
            job.data,
        });
      },
      {
        connection:
          redis,
      }
    );

  worker.on(
    "completed",
    job => {
      logger.info({
        jobId:
          job.id,
        status:
          "completed",
      });
    }
  );

  worker.on(
    "failed",
    (
      job,
      error
    ) => {
      logger.error({
        jobId:
          job?.id,
        error:
          error.message,
      });
    }
  );

  return worker;
}
