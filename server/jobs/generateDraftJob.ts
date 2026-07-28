import { generateReply } from "../services/openai";
import { draftRepository } from "../repositories/DraftRepository";

export async function generateDraftJob(
  draftId: string,
  prompt: string
) {
  const reply =
    await generateReply(prompt);

  await draftRepository.update(
    draftId,
    {
      reply,
    }
  );
}
