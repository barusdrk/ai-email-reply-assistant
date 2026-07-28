import {
  Worker,
  type Processor,
  type Job,
} from "bullmq";

import redis from "../config/redis.js";
import { logger } from "../config/logger.js";

export function createWorker<T>(
  queueName: string,
  processor: Processor<T>
) {
  const worker = new Worker<T>(
    queueName,
    processor,
    {
      connection: redis,
      concurrency: 5,
    }
  );

  worker.on(
    "ready",
    () => {
      logger.info({
        worker: queueName,
        status: "ready",
      });
    }
  );

  worker.on(
    "completed",
    (job: Job<T>) => {
      logger.info({
        worker: queueName,
        jobId: job.id,
        status: "completed",
      });
    }
  );

  worker.on(
    "failed",
    (job, error) => {
      logger.error({
        worker: queueName,
        jobId: job?.id,
        error,
      });
    }
  );

  return worker;
}
