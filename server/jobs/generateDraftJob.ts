import { generateReply } from "../services/openai.js";
import { draftRepository } from "../repositories/DraftRepository.js";

export async function generateDraftJob(
  draftId: string,
  prompt: string
) {
  const reply =
    await generateReply({
      email: prompt,
      tone: "professional",
      length: "medium",
    });

  await draftRepository.update(
    draftId,
    {
      reply,
    }
  );
}
