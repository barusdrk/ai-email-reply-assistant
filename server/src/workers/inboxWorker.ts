import type { Job } from "bullmq";

import { createWorker } from "./createWorker.js";
import { syncInbox } from "../services/email.js";

interface InboxJob {
  userId: string;
  provider: "gmail" | "outlook";
}

export const inboxWorker =
createWorker<InboxJob>(
  "inbox",

  async (
    job: Job<InboxJob>
  ) => {
    await syncInbox(
      job.data.provider,
      job.data.userId
    );
  }
);
