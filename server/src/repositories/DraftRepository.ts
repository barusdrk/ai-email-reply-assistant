import type { DeleteResult } from "mongodb";
import DraftModel, { type DraftDocument, type DraftStatus } from "../models/Draft.js";

class DraftRepository {
  findAll(userId: string, status?: DraftStatus) {
    const filter: { userId: string; status?: DraftStatus } = { userId };
    if (status) filter.status = status;
    return DraftModel.find(filter).sort({ createdAt: -1 });
  }

  findById(id: string) {
    return DraftModel.findById(id);
  }

  create(data: Partial<DraftDocument>) {
    return DraftModel.create(data);
  }

  update(id: string, data: Partial<DraftDocument>) {
    return DraftModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  delete(id: string) {
    return DraftModel.findByIdAndDelete(id);
  }

  deleteOlderThan(date: Date): Promise<DeleteResult> {
    return DraftModel.deleteMany({ createdAt: { $lt: date } });
  }
}

export const draftRepository = new DraftRepository();
