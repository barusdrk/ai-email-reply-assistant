import { emailQueue } from "../config/emailQueue";

export async function processWebhook(
  provider: "gmail" | "outlook",
  payload: unknown
) {
  await emailQueue.add(
    "sync",
    {
      provider,
      payload,
    }
  );
}
