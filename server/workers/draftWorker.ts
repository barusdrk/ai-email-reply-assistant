import { createWorker }
from "./createWorker.js";

import {
  generateDraftJob,
} from "../jobs/generateDraftJob.js";

export const draftWorker =
createWorker(
  "drafts",

  async job => {
    const data = job.data as {
      draftId: string;
      prompt: string;
    };

    await generateDraftJob(
      data.draftId,
      data.prompt
    );
  }
);
