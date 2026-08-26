import NotificationModel, {
  type NotificationDocument
} from "../models/Notification.js";

class NotificationRepository {
  findByUser(userId: string) {
    return NotificationModel
      .find({ userId })
      .sort({ createdAt: -1 });
  }

  findById(id: string) {
    return NotificationModel.findById(id);
  }

  create(data: Partial<NotificationDocument>) {
    return NotificationModel.create(data);
  }

  markRead(id: string) {
    return NotificationModel.findByIdAndUpdate(
      id,
      {
        $set: {
          read: true
        }
      },
      {
        new: true
      }
    );
  }

  markAllRead(userId: string) {
    return NotificationModel.updateMany(
      {
        userId,
        read: false
      },
      {
        $set: {
          read: true
        }
      }
    );
  }

  delete(id: string) {
    return NotificationModel.findByIdAndDelete(id);
  }

  deleteOlderThan(
    date: Date
  ): Promise<
    Awaited<
      ReturnType<
        typeof NotificationModel.deleteMany
      >
    >
  > {
    return NotificationModel.deleteMany({
      createdAt: {
        $lt: date
      }
    });
  }
}

export const notificationRepository =
  new NotificationRepository();
  