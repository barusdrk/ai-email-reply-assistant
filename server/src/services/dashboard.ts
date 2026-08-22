import { Types } from "mongoose";
import EmailModel from "../models/Email.js";
import DraftModel from "../models/Draft.js";

export interface DashboardStats {
  inboxEmails: number;
  draftReplies: number;
  pendingApprovals: number;
  sentToday: number;
}

export async function getDashboardStats(
  userId: string
): Promise<DashboardStats> {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  const userObjectId = new Types.ObjectId(userId);
  const startOfToday = new Date();

  startOfToday.setHours(0, 0, 0, 0);

  const startOfTomorrow = new Date(startOfToday);

  startOfTomorrow.setDate(
    startOfTomorrow.getDate() + 1
  );

  const [
    inboxEmails,
    draftReplies,
    pendingApprovals,
    sentToday,
  ] = await Promise.all([
    EmailModel.countDocuments({
      userId: userObjectId,
    }),
    DraftModel.countDocuments({
      userId: userObjectId,
    }),
    DraftModel.countDocuments({
      userId: userObjectId,
      status: "pending",
    }),
    DraftModel.countDocuments({
      userId: userObjectId,
      status: "sent",
      sentAt: {
        $gte: startOfToday,
        $lt: startOfTomorrow,
      },
    }),
  ]);

  return {
    inboxEmails,
    draftReplies,
    pendingApprovals,
    sentToday,
  };
}
