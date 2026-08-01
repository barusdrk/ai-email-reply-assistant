import type { Job } from "bullmq";

import { createWorker } from "./createWorker.js";
import { createDraft } from "../services/drafts.js";

interface DraftJob {
  userId: string;
  emailId: string;
  subject: string;
  customer: string;
  email: string;
  tone?:
    | "professional"
    | "friendly"
    | "formal"
    | "empathetic";
  length?:
    | "short"
    | "medium"
    | "long";
}

export const draftWorker =
  createWorker<DraftJob>(
    "drafts",

    async (
      job: Job<DraftJob>
    ) => {
      await createDraft({
        userId:
          job.data.userId,
        emailId:
          job.data.emailId,
        subject:
          job.data.subject,
        customer:
          job.data.customer,
        email:
          job.data.email,
        tone:
          job.data.tone,
        length:
          job.data.length,
      });
    }
  );
  