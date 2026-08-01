import { createWorker }
from "./createWorker.js";

import { cleanupJob } from "../jobs/cleanup.js";

export const cleanupWorker =
createWorker(
  "cleanup",

  async () => {
    await cleanupJob();
  }
);
