import Notification from "../models/Notification.js";

class NotificationRepository {
  findByUser(userId: string) {
    return Notification.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
  }

  unread(userId: string) {
    return Notification.find({
      userId,
      read: false,
    }).lean();
  }

  create(data: Partial<import("../models/Notification.js").NotificationDocument>) {
    return Notification.create(data as any);
  }

  markRead(id: string) {
    return Notification.findByIdAndUpdate(
      id,
      { read: true },
      {
        new: true,
        lean: true,
      }
    );
  }

  deleteOlderThan(date: Date) {
    return Notification.deleteMany({
      createdAt: {
        $lt: date,
      },
    });
  }

  delete(id: string) {
    return Notification.findByIdAndDelete(id);
  }
}

export const notificationRepository =
  new NotificationRepository();
