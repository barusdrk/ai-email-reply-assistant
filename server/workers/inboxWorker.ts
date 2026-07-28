import { createWorker }
from "./createWorker.js";

import {
  syncInbox,
} from "../services/email.js";

export const inboxWorker =
createWorker(
  "inbox",

  async job => {
    const data = job.data as {
      userId: string;
      provider: "gmail" | "outlook";
    };

    await syncInbox(
      data.provider,
      data.userId
    );
  }
);
