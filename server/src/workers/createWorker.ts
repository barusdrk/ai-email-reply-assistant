import {
  Worker,
  type Job,
  type Processor,
} from "bullmq";

import redis from "../config/redis.js";
import { logger } from "../config/logger.js";

export function createWorker<T>(
  queueName:string,
  processor:Processor<T>
) {
  if (!redis) {
    logger.warn({
      worker:queueName,
      status:
        "disabled - redis unavailable",
    });

    return null;
  }

  const worker =
    new Worker<T>(
      queueName,
      processor,
      {
        connection:redis,
        concurrency:5,
      }
    );

  worker.on(
    "ready",
    ()=>{
      logger.info({
        worker:queueName,
        status:"ready",
      });
    }
  );

  worker.on(
    "completed",
    (job:Job<T>)=>{
      logger.info({
        worker:queueName,
        jobId:job.id,
        status:"completed",
      });
    }
  );

  worker.on(
    "failed",
    (
      job:Job<T>|undefined,
      error:Error
    )=>{
      logger.error({
        worker:queueName,
        jobId:job?.id,
        error:error.message,
        stack:error.stack,
      });
    }
  );

  return worker;
}
