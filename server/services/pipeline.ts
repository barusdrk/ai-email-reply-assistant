import { classifyEmail, generateReply, summarizeEmail } from "./openai";
import { calculatePriority } from "./priority";
import { draftRepository } from "../repositories/DraftRepository";

export async function processIncomingEmail(
  email: {
    id: string;
    subject: string;
    body: string;
  }
) {
  const summary =
    await summarizeEmail(email.body);

  const category =
    await classifyEmail(email.body);

  const priority =
    calculatePriority(
      email.subject,
      email.body
    );

  const prompt = `
Category: ${category}

Priority: ${priority}

Summary:
${summary}

Customer Email:
${email.body}
`;

  const reply =
    await generateReply(prompt);

  await draftRepository.create({
    emailId: email.id,
    reply,
    tone: "professional",
    length: "medium",
    status: "draft",
  });

  return {
    summary,
    category,
    priority,
    reply,
  };
}
