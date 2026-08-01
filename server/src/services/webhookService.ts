import { emailQueue } from "../config/emailQueue.js";

export async function processWebhook(
  provider: "gmail" | "outlook",
  payload: unknown
) {
  if (!emailQueue) {
    console.warn(
      "Redis is disabled. Skipping webhook queue."
    );
    return;
  }

  await emailQueue.add(
    "sync",
    {
      provider,
      payload,
    }
  );
}
