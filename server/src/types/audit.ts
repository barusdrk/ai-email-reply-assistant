export interface AuditInput {
  action: string;
  entity: string;
  entityId: string;
  userId?: string;
  details?: unknown;
}
