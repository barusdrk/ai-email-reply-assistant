import { Queue } from "bullmq";
import redis from "./redis.js";

export const emailQueue =
  redis
    ? new Queue(
        "email",
        {
          connection: redis,
        }
      )
    : null;

export const draftQueue =
  redis
    ? new Queue(
        "draft",
        {
          connection: redis,
        }
      )
    : null;

export const syncQueue =
  redis
    ? new Queue(
        "sync",
        {
          connection: redis,
        }
      )
    : null;

export const notificationQueue =
  redis
    ? new Queue(
        "notification",
        {
          connection: redis,
        }
      )
    : null;
