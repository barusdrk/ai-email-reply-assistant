import { syncInbox } from "../services/email";
import { processIncomingEmail } from "../services/pipeline";

export async function emailSyncJob(
  userId: string
) {
  const emails =
    await syncInbox("gmail", userId);

  for (const email of emails) {
    await processIncomingEmail({
      id: email._id.toString(),
      subject: email.subject,
      body: email.body,
    });
  }
}
