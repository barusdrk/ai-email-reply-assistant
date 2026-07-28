import Email from "../models/Email.js";

class EmailRepository {
  findAll(userId: string) {
    return Email.find({ userId })
      .sort({ receivedAt: -1 })
      .lean();
  }

  findById(id: string) {
    return Email.findById(id).lean();
  }

  findWithoutDraft() {
    return Email.find({
      $or: [
        { draftId: null },
        { draftId: { $exists: false } },
      ],
    }).lean();
  }

  create(data: any) {
    return Email.create(data);
  }

  update(id: string, data: any) {
    return Email.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        lean: true,
      }
    );
  }

  delete(id: string) {
    return Email.findByIdAndDelete(id);
  }
}

export const emailRepository =
  new EmailRepository();
