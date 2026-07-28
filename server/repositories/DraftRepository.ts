import Draft from "../models/Draft.js";

class DraftRepository {
  async findAll(userId: string) {
    return Draft.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();
  }

  async findById(id: string) {
    return Draft.findById(id).lean();
  }

  async create(data: any) {
    const draft = await Draft.create(data);
    return draft.toObject();
  }

  async update(id: string, data: any) {
    return Draft.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        lean: true,
      }
    );
  }

  async delete(id: string) {
    return Draft.findByIdAndDelete(id);
  }
}

export const draftRepository =
  new DraftRepository();
