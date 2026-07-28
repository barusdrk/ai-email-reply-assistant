import type {
  NotificationType,
} from "../types/notification.js";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
}
