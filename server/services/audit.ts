import { auditLogRepository } from "../repositories/AuditLogRepository";

export function audit(
  action: string,
  entity: string,
  entityId: string,
  userId?: string,
  details?: unknown
) {
  return auditLogRepository.create({
    action,
    entity,
    entityId,
    userId,
    details,
  });
}

export function userAudit(
  userId: string
) {
  return auditLogRepository.findByUser(
    userId
  );
}

export function recentAudit() {
  return auditLogRepository.recent();
}
