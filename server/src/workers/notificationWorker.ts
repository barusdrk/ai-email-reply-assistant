import type { Job } from "bullmq";

import { createWorker } from "./createWorker.js";
import {
  notify,
  type NotificationType,
} from "../services/notification.js";

interface NotificationJob {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
}

export const notificationWorker =
createWorker<NotificationJob>(
  "notifications",

  async (
    job: Job<NotificationJob>
  ) => {
    await notify(
      job.data.userId,
      job.data.type,
      job.data.title,
      job.data.message,
      job.data.referenceId
    );
  }
);
