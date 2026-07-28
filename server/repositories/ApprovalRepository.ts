import Approval from "../models/Approval";

class ApprovalRepository {
  findPending() {
    return Approval.find({ status: "pending" })
      .populate("draftId")
      .populate("reviewerId")
      .populate("requesterId")
      .lean();
  }

  findById(id: string) {
    return Approval.findById(id).lean();
  }

  findByReviewer(reviewerId: string) {
    return Approval.find({ reviewerId })
      .sort({ createdAt: -1 })
      .lean();
  }

  create(data: any) {
    return Approval.create(data);
  }

  update(id: string, data: any) {
    return Approval.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        lean: true,
      }
    );
  }

  async findByDraft(draftId: string) {
    return Approval.findOne({ draftId }).lean();
  }

  delete(id: string) {
    return Approval.findByIdAndDelete(id);
  }
}

export const approvalRepository =
  new ApprovalRepository();
