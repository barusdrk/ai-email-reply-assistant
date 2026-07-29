import { emailRepository } from "../repositories/EmailRepository.js";
import { createDraft } from "../services/drafts.js";

export async function autoDraftJob() {
  const emails =
    await emailRepository.findAllWithoutDraft();

  for (const email of emails) {
    if (!email.userId) {
      continue;
    }

    await createDraft({
      userId:
        email.userId.toString(),

      emailId:
        email._id.toString(),

      subject:
        email.subject ?? "(No subject)",

      customer:
        email.from ?? "Unknown sender",

      email:
        email.body ?? "",

      tone:
        "professional",

      length:
        "medium",
    });
  }
}
