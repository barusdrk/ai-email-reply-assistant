import type { Job } from "bullmq";

import { createWorker } from "./createWorker.js";
import { createDraft } from "../services/drafts.js";

interface DraftJob {
  userId: string;
  emailId: string;
  reply: string;
  subject: string;
}

export const draftWorker =
createWorker<DraftJob>(
  "drafts",

  async (
    job: Job<DraftJob>
  ) => {
    await createDraft({
      userId: job.data.userId,
      emailId: job.data.emailId,
      subject: job.data.subject,
      reply: job.data.reply,
    });
  }
);
