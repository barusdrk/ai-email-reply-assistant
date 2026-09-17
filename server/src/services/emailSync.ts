import {Types} from "mongoose";
import {emailRepository} from "../repositories/EmailRepository.js";
import {customerRepository} from "../repositories/CustomerRepository.js";
import {connectedAccountRepository} from "../repositories/ConnectedAccountRepository.js";
import {draftRepository} from "../repositories/DraftRepository.js";
import {listEmails as listGmailEmails, type InboxEmail as GmailInboxEmail} from "./gmail.js";
import {listEmails as listOutlookEmails, type InboxEmail as OutlookInboxEmail} from "./outlook.js";
import {createDraft} from "./drafts.js";

type EmailProvider = "gmail" | "outlook";

export type NormalizedEmail = {
  userId: Types.ObjectId;
  provider: EmailProvider;
  messageId: string;
  messageIdHeader: string;
  references: string[];
  threadId: string;
  subject: string;
  from: string;
  senderName: string;
  senderEmail: string;
  preview: string;
  body: string;
  unread: boolean;
  archived: boolean;
  receivedAt: Date;
};

export interface SyncResult {
  provider: EmailProvider;
  synced: number;
  created: number;
  updated: number;
  failed: number;
  newEmails: NormalizedEmail[];
  emails: Awaited<ReturnType<typeof emailRepository.findAll>>;
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function extractEmailAddress(value: string): string {
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.trim().toLowerCase() ?? "";
}

function isCustomerMessage(email: NormalizedEmail, accountEmail?: string): boolean {
  const senderEmail = normalizeAddress(email.senderEmail || extractEmailAddress(email.from));
  const connectedEmail = normalizeAddress(accountEmail ?? "");
  if (!senderEmail) return false;
  if (connectedEmail && senderEmail === connectedEmail) return false;
  return true;
}

function normalizeGmailEmail(userId: string, email: GmailInboxEmail): NormalizedEmail {
  return {
    userId: new Types.ObjectId(userId),
    provider: "gmail",
    messageId: email.id,
    messageIdHeader: email.messageIdHeader ?? "",
    references: email.references ?? [],
    threadId: email.threadId ?? "",
    subject: email.subject ?? "",
    from: email.from ?? "",
    senderName: email.senderName ?? "",
    senderEmail: email.senderEmail ?? "",
    preview: email.preview ?? "",
    body: email.body ?? "",
    unread: email.unread ?? true,
    archived: email.archived ?? false,
    receivedAt: email.receivedAt ?? new Date(),
  };
}

function normalizeOutlookEmail(userId: string, email: OutlookInboxEmail): NormalizedEmail {
  const from = email.from?.trim() ?? "";
  const senderEmail = extractEmailAddress(from);
  const senderName = senderEmail
    ? from.replace(senderEmail, "").replace(/^["']|["']$/g, "").replace(/[<>]/g, "").trim()
    : "";
  return {
    userId: new Types.ObjectId(userId),
    provider: "outlook",
    messageId: email.id,
    messageIdHeader: "",
    references: [],
    threadId: email.threadId ?? "",
    subject: email.subject ?? "",
    from,
    senderName,
    senderEmail,
    preview: email.preview ?? "",
    body: email.body ?? "",
    unread: email.unread ?? true,
    archived: email.archived ?? false,
    receivedAt: email.receivedAt ?? new Date(),
  };
}

async function linkEmailsToCustomers(userId: string, emails: NormalizedEmail[], accountEmail?: string) {
  let linked = 0;
  let skipped = 0;
  let failed = 0;
  for (const email of emails) {
    try {
      if (!isCustomerMessage(email, accountEmail)) {
        skipped++;
        continue;
      }
      const senderEmail = normalizeAddress(email.senderEmail || extractEmailAddress(email.from));
      if (!senderEmail) {
        skipped++;
        continue;
      }
      const customer = await customerRepository.findOrCreate({
        userId,
        email: senderEmail,
        name: email.senderName,
      });
      if (!customer) {
        skipped++;
        continue;
      }
      const storedEmail = await emailRepository.findByMessageId(userId, email.provider, email.messageId);
      if (!storedEmail) {
        skipped++;
        continue;
      }
      if (!storedEmail.customerId || storedEmail.customerId.toString() !== customer._id.toString()) {
        await emailRepository.update(storedEmail._id.toString(), {
          customerId: customer._id,
        });
      }
      linked++;
    } catch (error) {
      failed++;
      console.error("CRM customer linking failed:", {
        provider: email.provider,
        messageId: email.messageId,
        senderEmail: email.senderEmail,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
  return {linked, skipped, failed};
}

async function generateDraftsForNewEmails(userId: string, emails: NormalizedEmail[], accountEmail?: string) {
  let created = 0;
  let skipped = 0;
  let failed = 0;
  const storedEmails = await emailRepository.findAll(userId);
  for (const email of emails) {
    try {
      if (!isCustomerMessage(email, accountEmail)) {
        skipped++;
        continue;
      }
      if (!email.body.trim()) {
        skipped++;
        continue;
      }
      const storedEmail = storedEmails.find(
        (stored) => stored.provider === email.provider && stored.messageId === email.messageId
      );
      if (!storedEmail) {
        skipped++;
        continue;
      }
      const existingDraft = await draftRepository.findByEmailId(storedEmail._id.toString());
      if (existingDraft) {
        skipped++;
        continue;
      }
      await createDraft({
        userId,
        emailId: storedEmail._id.toString(),
        provider: email.provider,
        subject: email.subject,
        customer: email.senderEmail,
        email: email.body,
      });
      created++;
    } catch (error) {
      failed++;
      console.error("Automatic draft generation failed:", {
        provider: email.provider,
        messageId: email.messageId,
        senderEmail: email.senderEmail,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
  return {created, skipped, failed};
}

async function syncProvider(userId: string, provider: EmailProvider, sourceEmails: NormalizedEmail[]): Promise<SyncResult> {
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID.");
  const existingEmails = await emailRepository.findAll(userId);
  const existingIds = new Set(
    existingEmails.filter((email) => email.provider === provider).map((email) => email.messageId)
  );
  const newEmails = sourceEmails.filter((email) => !existingIds.has(email.messageId));
  if (sourceEmails.length > 0) await emailRepository.bulkUpsert(sourceEmails);
  const account = await connectedAccountRepository.findByProvider(userId, provider);
  const customerResult = await linkEmailsToCustomers(userId, sourceEmails, account?.email);
  console.log("CRM customer linking:", {
    provider,
    emails: sourceEmails.length,
    linked: customerResult.linked,
    skipped: customerResult.skipped,
    failed: customerResult.failed,
  });
  if (newEmails.length > 0) {
    const draftResult = await generateDraftsForNewEmails(userId, newEmails, account?.email);
    console.log("Automatic draft generation:", {
      provider,
      newEmails: newEmails.length,
      draftsCreated: draftResult.created,
      draftsSkipped: draftResult.skipped,
      draftsFailed: draftResult.failed,
    });
  }
  if (account) {
    await connectedAccountRepository.update(account._id.toString(), {
      syncStatus: "idle",
      lastSyncAt: new Date(),
      lastError: "",
      connected: true,
    });
  }
  return {
    provider,
    synced: sourceEmails.length,
    created: newEmails.length,
    updated: sourceEmails.length - newEmails.length,
    failed: 0,
    newEmails,
    emails: await emailRepository.findAll(userId),
  };
}

async function markSyncError(userId: string, provider: EmailProvider, error: unknown) {
  const account = await connectedAccountRepository.findByProvider(userId, provider);
  if (!account) return;
  await connectedAccountRepository.update(account._id.toString(), {
    syncStatus: "error",
    lastError: error instanceof Error ? error.message : "Email sync failed.",
  });
}

export async function syncGmail(userId: string): Promise<SyncResult> {
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID.");
  const account = await connectedAccountRepository.findByProvider(userId, "gmail");
  if (!account?.connected) throw new Error("Gmail is not connected.");
  await connectedAccountRepository.update(account._id.toString(), {
    syncStatus: "syncing",
    lastError: "",
  });
  try {
    const emails = await listGmailEmails(userId);
    const normalized = emails.map((email) => normalizeGmailEmail(userId, email));
    return await syncProvider(userId, "gmail", normalized);
  } catch (error) {
    await markSyncError(userId, "gmail", error);
    throw error;
  }
}

export async function syncOutlook(userId: string): Promise<SyncResult> {
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID.");
  const account = await connectedAccountRepository.findByProvider(userId, "outlook");
  if (!account?.connected) throw new Error("Outlook is not connected.");
  await connectedAccountRepository.update(account._id.toString(), {
    syncStatus: "syncing",
    lastError: "",
  });
  try {
    const emails = await listOutlookEmails(userId);
    const normalized = emails.map((email) => normalizeOutlookEmail(userId, email));
    return await syncProvider(userId, "outlook", normalized);
  } catch (error) {
    await markSyncError(userId, "outlook", error);
    throw error;
  }
}

export async function syncInbox(userId: string, provider?: EmailProvider) {
  if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid user ID.");
  if (provider === "gmail") return {gmail: await syncGmail(userId)};
  if (provider === "outlook") return {outlook: await syncOutlook(userId)};
  const results: {gmail?: SyncResult; outlook?: SyncResult} = {};
  const gmailAccount = await connectedAccountRepository.findByProvider(userId, "gmail");
  const outlookAccount = await connectedAccountRepository.findByProvider(userId, "outlook");
  if (gmailAccount?.connected) {
    try {
      results.gmail = await syncGmail(userId);
    } catch (error) {
      console.error("Gmail inbox sync failed:", error);
    }
  }
  if (outlookAccount?.connected) {
    try {
      results.outlook = await syncOutlook(userId);
    } catch (error) {
      console.error("Outlook inbox sync failed:", error);
    }
  }
  return results;
}

export async function syncConnectedInbox(userId: string) {
  return syncInbox(userId);
}
