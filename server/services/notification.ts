import { notificationRepository } from "../repositories/NotificationRepository.js";
import { emitInbox } from "./websocket.js";

export type NotificationType=
  |"email"
  |"draft"
  |"approval"
  |"sent"
  |"system"
  |"error";

export async function notify(
  userId:string,
  type:NotificationType,
  title:string,
  message:string,
  referenceId?:string
){
  const notification=
    await notificationRepository.create({
      userId:userId as any,
      type,
      title,
      message,
      referenceId,
      read:false,
      createdAt:new Date(),
    } as any);

  emitInbox(userId);

  return notification;
}

export function notifications(
  userId:string
){
  return notificationRepository.findByUser(
    userId
  );
}

export function notification(
  id:string
){
  return notificationRepository.findById(
    id
  );
}

export function markRead(
  id:string
){
  return notificationRepository.markRead(
    id
  );
}

export function markAllRead(
  userId:string
){
  return notificationRepository.markAllRead(
    userId
  );
}

export function removeNotification(
  id:string
){
  return notificationRepository.delete(id);
}

export async function broadcast(
  userIds:string[],
  type:NotificationType,
  title:string,
  message:string
){
  await Promise.all(
    userIds.map(userId=>
      notify(
        userId,
        type,
        title,
        message
      )
    )
  );
}
