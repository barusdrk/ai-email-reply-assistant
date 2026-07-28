import AuditLog from "../models/AuditLog.js";

class AuditLogRepository {
  create(data: any) {
    return AuditLog.create(data);
  }

  findByUser(userId: string) {
    return AuditLog.find({
      userId,
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  recent(limit = 100) {
    return AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  deleteOlderThan(date: Date) {
    return AuditLog.deleteMany({
      createdAt: {
        $lt: date,
      },
    });
  }
}

export const auditLogRepository =
  new AuditLogRepository();
