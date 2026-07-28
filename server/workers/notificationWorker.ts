import { createWorker }
from "./createWorker.js";

import {
  notify as sendNotification,
} from "../services/notification.js";

export const notificationWorker =
createWorker(
  "notifications",

  async job => {
    const data = job.data as {
      userId: string;
      type: string;
      title: string;
      message: string;
      referenceId?: string;
    };

    await sendNotification(
      data.userId,
      data.type as any,
      data.title,
      data.message,
      data.referenceId
    );
  }
);
