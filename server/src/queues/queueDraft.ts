import { Queue } from "bullmq";

import redis from "../config/redis.js";

interface DraftJob {
  userId:string;
  draftId:string;
}

export const draftQueue =
  redis
    ? new Queue<DraftJob>(
        "draft",
        {
          connection:
            redis,
        }
      )
    : null;

export async function addDraftJob(
  data: DraftJob
) {
  if (!draftQueue) {
    return null;
  }

  return draftQueue.add(
    "generate",
    data
  );
}
