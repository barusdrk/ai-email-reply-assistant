import { Redis } from "ioredis";

import { env } from "./env.js";
import { logger } from "./logger.js";

const redis =
  env.REDIS_URL
    ? new Redis(
        env.REDIS_URL,
        {
          maxRetriesPerRequest:null,
          enableReadyCheck:true,
          lazyConnect:false,
        }
      )
    : null;

if (redis) {
  redis.on(
    "connect",
    () => {
      logger.info(
        "Redis connected."
      );
    }
  );

  redis.on(
    "ready",
    () => {
      logger.info(
        "Redis ready."
      );
    }
  );

  redis.on(
    "reconnecting",
    () => {
      logger.warn(
        "Redis reconnecting..."
      );
    }
  );

  redis.on(
    "close",
    () => {
      logger.warn(
        "Redis connection closed."
      );
    }
  );

  redis.on(
    "error",
    (error:Error) => {
      logger.error({
        message:error.message,
        stack:error.stack,
      });
    }
  );
}

export default redis;
