import {Types} from "mongoose";
import EmailModel, {type EmailDocument} from "../models/Email.js";

class EmailRepository {
  findAll(userId: string) {
    return EmailModel.find({userId}).sort({receivedAt: -1});
  }

  async findPage(userId: string, page = 1, limit = 50) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const filter = {userId};
    const [emails, total] = await Promise.all([
      EmailModel.find(filter).sort({receivedAt: -1}).skip((safePage - 1) * safeLimit).limit(safeLimit),
      EmailModel.countDocuments(filter),
    ]);

    return {
      emails,
      total,
      page: safePage,
      limit: safeLimit,
      hasMore: safePage * safeLimit < total,
    };
  }

  findById(id: string) {
    return EmailModel.findById(id);
  }

  findByMessageId(userId: string, provider: EmailDocument["provider"], messageId: string) {
    return EmailModel.findOne({userId, provider, messageId});
  }

  findAllWithoutDraft(userId?: string) {
    const filter: Record<string, unknown> = {
      $or: [{draftId: null}, {draftId: {$exists: false}}],
    };

    if (userId) filter.userId = userId;

    return EmailModel.find(filter).sort({receivedAt: -1});
  }

  create(data: Partial<EmailDocument>) {
    return EmailModel.create(data);
  }

  upsert(messageId: string, data: Partial<EmailDocument>) {
    return EmailModel.findOneAndUpdate(
      {userId: data.userId, provider: data.provider, messageId},
      {$set: data},
      {new: true, upsert: true},
    );
  }

  async bulkUpsert(emails: Partial<EmailDocument>[]) {
    const operations = emails
      .filter((email) => Boolean(email.userId && email.provider && email.messageId))
      .map((email) => ({
        updateOne: {
          filter: {
            userId: email.userId,
            provider: email.provider,
            messageId: email.messageId,
          },
          update: {$set: email},
          upsert: true,
        },
      }));

    if (operations.length === 0) return EmailModel.bulkWrite([]);

    return EmailModel.bulkWrite(operations, {ordered: false});
  }

  update(id: string, data: Partial<EmailDocument>) {
    return EmailModel.findByIdAndUpdate(id, {$set: data}, {new: true});
  }

  delete(id: string) {
    return EmailModel.findByIdAndDelete(id);
  }
}

export const emailRepository = new EmailRepository();
