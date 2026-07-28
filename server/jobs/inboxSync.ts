import { connectedAccountRepository } from "../repositories/ConnectedAccountRepository.js";
import { syncInbox } from "../services/email.js";
import { audit } from "../services/audit.js";

export async function inboxSyncJob() {
  const accounts =
    await connectedAccountRepository.findConnected();

  for (const account of accounts) {
    try {
      await syncInbox(
        account.provider,
        account.userId.toString()
      );

      await connectedAccountRepository.update(
        account._id.toString(),
        {
          lastSyncAt: new Date(),
          syncStatus: "idle",
          lastError: "",
        }
      );
    } catch (error) {
      await connectedAccountRepository.update(
        account._id.toString(),
        {
          syncStatus: "error",
          lastError: String(error),
        }
      );

      await audit(
        "sync_failed",
        "connected_account",
        account._id.toString(),
        account.userId.toString(),
        { error: String(error) }
      );
    }
  }
}
