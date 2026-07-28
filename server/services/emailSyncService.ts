import { gmail } from "../config/gmail.js";
import { emailRepository } from "../repositories/EmailRepository.js";

export async function syncInbox(
  userId: string
) {
  const { data } =
    await gmail.users.messages.list({
      userId: "me",
      maxResults: 25,
    });

  for (const message of data.messages ?? []) {
    await emailRepository.create({
      userId,
      provider: "gmail",
      messageId: message.id,
      threadId: message.threadId,
    });
  }
}
