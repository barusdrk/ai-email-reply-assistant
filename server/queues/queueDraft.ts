import { Queue } from "bullmq";

import redis from "../config/redis.js";

export interface QueueDraftData {
  draftId: string;
  prompt: string;
}

export const draftQueue = new Queue<QueueDraftData>(
  "drafts",
  {
    connection: redis,
  }
);

export async function queueDraft(
  data: QueueDraftData
) {
  return draftQueue.add(
    "generate-draft",
    data,
    {
      attempts: 3,
      removeOnComplete: 100,
      removeOnFail: 500,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    }
  );
}
