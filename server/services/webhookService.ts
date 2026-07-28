import { emailQueue } from "../config/emailQueue.js";

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
