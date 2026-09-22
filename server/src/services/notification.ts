import {Types} from "mongoose";
import {notificationRepository} from "../repositories/NotificationRepository.js";
import {emitInbox} from "./websocket.js";
import {getSettings} from "./settings.js";
import {sendEmail as sendProviderEmail,type Provider} from "./sendEmail.js";
import UserModel from "../models/User.js";

export type NotificationType="email"|"draft"|"approval"|"sent"|"system"|"error";

export interface NewCustomerEmailNotification{
  id:string;
  senderName?:string;
  senderEmail?:string;
  subject?:string;
  preview?:string;
  referenceId?:string;
}

function resolveProvider(value:unknown):Provider|null{
  return value==="gmail"||value==="outlook"?value:null;
}

export async function notify(
  userId:string,
  type:NotificationType,
  title:string,
  message:string,
  referenceId?:string,
){
  const notification=await notificationRepository.create({
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

export async function notifyNewCustomerEmail(
  userId:string,
  email:NewCustomerEmailNotification,
){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

  const sender=email.senderName?.trim()||email.senderEmail?.trim()||"Customer";
  const subject=email.subject?.trim()||"New customer message";
  const preview=email.preview?.trim()||"A new customer message requires your attention.";

  const notification=await notify(
    userId,
    "email",
    "New customer message",
    `${sender}: ${subject}`,
    email.referenceId??email.id,
  );

  try{
    const settings=await getSettings(userId);
    if(!settings.emailNotifications)return notification;

    const user=await UserModel
      .findById(userId)
      .select("email activeEmailProvider")
      .lean();

    if(!user?.email)return notification;

    const provider=resolveProvider(user.activeEmailProvider);
    if(!provider){
      console.warn(`Email notification skipped for user ${userId}: no active email provider.`);
      return notification;
    }

    await sendProviderEmail({
      userId,
      provider,
      to:user.email,
      subject:`New customer message: ${subject}`,
      reply:[
        "You have a new customer message in your support inbox.",
        "",
        `From: ${sender}`,
        `Subject: ${subject}`,
        "",
        preview,
        "",
        "Open your AI Customer Support Automation dashboard to review the conversation.",
      ].join("\n"),
    });
  }catch(error){
    console.error(
      `Failed to send email notification for user ${userId}:`,
      error instanceof Error?error.message:error,
    );
  }

  return notification;
}

export function notifications(userId:string){
  return notificationRepository.findByUser(userId);
}

export function notification(id:string){
  return notificationRepository.findById(id);
}

export function markRead(id:string){
  return notificationRepository.markRead(id);
}

export function markAllRead(userId:string){
  return notificationRepository.markAllRead(userId);
}

export function removeNotification(id:string){
  return notificationRepository.delete(id);
}

export async function broadcast(
  userIds:string[],
  type:NotificationType,
  title:string,
  message:string,
){
  await Promise.all(
    userIds.map((userId)=>notify(
      userId,
      type,
      title,
      message,
    )),
  );
}
