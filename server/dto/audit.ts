export interface CreateAuditLogInput {
  action: string;
  entity: string;
  entityId: string;
  userId?: string;
  details?: unknown;
  ipAddress?: string;
  userAgent?: string;
}
