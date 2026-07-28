import { notificationRepository } from "../repositories/NotificationRepository.js";
import { auditLogRepository } from "../repositories/AuditLogRepository.js";
import { connectedAccountRepository } from "../repositories/ConnectedAccountRepository.js";

const DAYS = 30;

export async function cleanupJob() {
  const cutoff =
    new Date(
      Date.now() -
      DAYS * 24 * 60 * 60 * 1000
    );

  await notificationRepository.deleteOlderThan(
    cutoff
  );

  await auditLogRepository.deleteOlderThan(
    cutoff
  );

  await connectedAccountRepository.clearExpiredTokens();

  console.log(
    "Cleanup completed",
    cutoff.toISOString()
  );
}
