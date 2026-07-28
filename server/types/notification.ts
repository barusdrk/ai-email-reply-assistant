export type NotificationType =
  | "email"
  | "draft"
  | "approval"
  | "sent"
  | "system"
  | "error";

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
}
