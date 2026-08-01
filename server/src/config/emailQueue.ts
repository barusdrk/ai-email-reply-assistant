import { Queue } from "bullmq";
import redis from "./redis.js";

export const emailQueue =
  new Queue(
    "email",
    {
      connection: redis,
    }
  );

export const draftQueue =
  new Queue(
    "draft",
    {
      connection: redis,
    }
  );

export const syncQueue =
  new Queue(
    "sync",
    {
      connection: redis,
    }
  );

export const notificationQueue =
  new Queue(
    "notification",
    {
      connection: redis,
    }
  );
