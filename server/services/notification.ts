import { notificationRepository } from "../repositories/NotificationRepository.js";
import { emitInbox } from "./websocket.js";

export type NotificationType =
  | "email"
  | "draft"
  | "approval"
  | "sent"
  | "error"
  | "system";

export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  referenceId?: string
) {
  const notification =
    await notificationRepository.create(
      {
        userId: userId as any,
        type,
        title,
        message,
        referenceId,
      } as any
    );

  emitInbox(userId);

  return notification;
}

export function notifications(
  userId: string
) {
  return notificationRepository.findByUser(
    userId
  );
}

export function markRead(id: string) {
  return notificationRepository.markRead(id);
}
