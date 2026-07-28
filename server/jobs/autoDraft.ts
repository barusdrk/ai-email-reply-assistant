import { emailRepository } from "../repositories/EmailRepository.js";
import { buildEmailPrompt } from "../prompts/emailPrompt.js";
import { queueDraft } from "../queues/queueDraft.js";

export async function autoDraftJob() {
  const emails =
    await emailRepository.findWithoutDraft();

  for (const email of emails) {
    const prompt =
      buildEmailPrompt({
        email: email.body,
        tone: "professional",
        length: "medium",
      });

    if (!email.draftId) continue;

    await queueDraft({
      draftId: email.draftId.toString(),
      prompt,
    });
  }
}
