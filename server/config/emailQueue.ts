import { Queue } from "bullmq";
import { redis } from "../config/redis";

export const emailQueue =
  new Queue("emails", {
    connection: redis,
  });
