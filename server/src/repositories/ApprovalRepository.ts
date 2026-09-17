import {Types} from "mongoose";
import ApprovalModel, {type ApprovalDocument} from "../models/Approval.js";

class ApprovalRepository {
  findAll(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return ApprovalModel.find({_id: null});
    return ApprovalModel.find({reviewerId: new Types.ObjectId(userId), status: "pending"}).sort({priority: -1, createdAt: -1});
  }

  findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return ApprovalModel.findById(id);
  }

  findByIdForReviewer(id: string, reviewerId: string) {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(reviewerId)) return null;
    return ApprovalModel.findOne({_id: new Types.ObjectId(id), reviewerId: new Types.ObjectId(reviewerId)});
  }

  findPendingByDraft(draftId: string) {
    if (!Types.ObjectId.isValid(draftId)) return null;
    return ApprovalModel.findOne({draftId: new Types.ObjectId(draftId), status: "pending"});
  }

  create(data: Partial<ApprovalDocument>) {
    return ApprovalModel.create(data);
  }

  update(id: string, data: Partial<ApprovalDocument>) {
    if (!Types.ObjectId.isValid(id)) return null;
    return ApprovalModel.findByIdAndUpdate(id, {$set: data}, {new: true});
  }

  delete(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return ApprovalModel.findByIdAndDelete(id);
  }
}

export const approvalRepository = new ApprovalRepository();
