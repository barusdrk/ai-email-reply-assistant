import { Types } from "mongoose";
import { connectedAccountRepository } from "../repositories/ConnectedAccountRepository.js";
import { syncInbox } from "./email.js";
import type { InboxEmail } from "./gmail.js";

export async function connectOutlook(
  userId: string
) {
  await connectedAccountRepository.upsert({
    userId:
      new Types.ObjectId(userId),
    provider: "outlook",
    connected: true,
  });

  return {
    connected: true,
  };
}

export async function disconnectOutlook(
  userId: string
) {
  await connectedAccountRepository.remove(
    userId,
    "outlook"
  );

  return {
    connected: false,
  };
}

export async function outlookStatus(
  userId: string
) {
  const account =
    await connectedAccountRepository.findOne(
      userId,
      "outlook"
    );

  return {
    connected:
      !!account,
  };
}

export async function syncOutlook(
  userId: string
) {
  return syncInbox(
    "outlook",
    userId
  );
}

export async function listEmails(): Promise<
  InboxEmail[]
> {
  return [];
}