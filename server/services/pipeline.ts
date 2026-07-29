import { Types } from "mongoose";
import {
  generateReply,
  summarizeEmail,
  classifyEmail,
} from "./openai.js";
import { draftRepository } from "../repositories/DraftRepository.js";
import { emailRepository } from "../repositories/EmailRepository.js";

export async function processEmail(
  emailId: string
) {
  const email =
    await emailRepository.findById(
      emailId
    );

  if (!email) {
    return null;
  }

  const summary =
    await summarizeEmail(
      email.body ?? ""
    );

  const category =
    await classifyEmail(
      email.body ?? ""
    );

  const reply =
    await generateReply({
      email:
        email.body ?? "",
      tone: "professional",
      length: "medium",
    });

  const draft =
    await draftRepository.create({
      userId:
        email.userId,
      emailId:
        new Types.ObjectId(
          emailId
        ),
      subject:
        email.subject,
      customer:
        email.from,
      reply,
      tone:
        "professional",
      status:
        "pending",
    });

  return {
    draft,
    summary,
    category,
  };
}
