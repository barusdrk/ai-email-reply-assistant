import { createWorker }
from "./createWorker.js";

import {
  syncInbox as synchronizeAllAccountsFromService,
} from "../services/emailSyncService.js";

export const syncWorker =
createWorker(
  "sync",

  async job => {
    const data = job.data as { userId: string };
    await synchronizeAllAccountsFromService(
      data.userId
    );
  }
);
