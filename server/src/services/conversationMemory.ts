import {Types} from "mongoose";
import UserModel from "../models/User.js";
import ConnectedAccountModel from "../models/ConnectedAccount.js";
import {emailRepository} from "../repositories/EmailRepository.js";

export interface ConversationMessage {
  role: "customer" | "company";
  subject: string;
  content: string;
  timestamp: Date | null;
}

const MAX_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 2000;
const MAX_CONTEXT_CHARS = 12000;

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

async function getCompanyEmailAddresses(userId: string): Promise<Set<string>> {
  const addresses = new Set<string>();
  if (!Types.ObjectId.isValid(userId)) return addresses;

  const user = await UserModel.findById(userId).select("email").lean();
  const primaryEmail = cleanText(user?.email).toLowerCase();
  if (primaryEmail) addresses.add(primaryEmail);

  const accounts = await ConnectedAccountModel.find({
    userId: new Types.ObjectId(userId),
  }).select("email").lean();

  for (const account of accounts) {
    const email = cleanText(account.email).toLowerCase();
    if (email) addresses.add(email);
  }

  return addresses;
}

function getSenderEmail(email: {
  senderEmail?: string | null;
  from?: string | null;
}): string {
  return cleanText(email.senderEmail ?? email.from).toLowerCase();
}

export async function getConversationHistory(
  userId: string,
  threadId: string,
  currentEmailId?: string
): Promise<ConversationMessage[]> {
  if (!Types.ObjectId.isValid(userId) || !threadId?.trim()) return [];

  const currentId =
    currentEmailId && Types.ObjectId.isValid(currentEmailId)
      ? currentEmailId
      : undefined;

  const companyEmailAddresses = await getCompanyEmailAddresses(userId);
  const emails = await emailRepository.findConversation(
    userId,
    threadId,
    currentId,
    MAX_MESSAGES,
  );

  const messages: ConversationMessage[] = [];

  for (const email of emails.reverse()) {
    const content = cleanText(email.body);
    if (!content) continue;

    const senderEmail = getSenderEmail(email);
    const role = companyEmailAddresses.has(senderEmail)
      ? "company"
      : "customer";

    messages.push({
      role,
      subject: cleanText(email.subject),
      content: content.slice(0, MAX_MESSAGE_CHARS),
      timestamp: email.receivedAt ?? email.createdAt ?? null,
    });
  }

  let totalChars = 0;
  const bounded: ConversationMessage[] = [];

  for (const message of messages) {
    const messageChars = message.content.length + message.subject.length + 80;
    if (totalChars + messageChars > MAX_CONTEXT_CHARS) break;
    bounded.push(message);
    totalChars += messageChars;
  }

  return bounded;
}

export function formatConversationHistory(
  messages: ConversationMessage[]
): string {
  if (!messages.length) return "";

  return messages
    .map((message, index) => {
      const timestamp = message.timestamp
        ? message.timestamp.toISOString()
        : "unknown time";

      return [
        `Message ${index + 1}`,
        `Role: ${message.role}`,
        `Time: ${timestamp}`,
        message.subject ? `Subject: ${message.subject}` : "",
        `Content: ${message.content}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}
