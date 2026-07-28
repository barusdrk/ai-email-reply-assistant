import { Types } from "mongoose";

import {
  ApprovalModel,
} from "../models/Approval.js";

class ApprovalRepository {

  findAll(userId:string){
    return ApprovalModel
      .find({
        reviewerId:new Types.ObjectId(userId),
      })
      .sort({
        createdAt:-1,
      });
  }

  findById(id:string){
    return ApprovalModel.findById(id);
  }

  create(data:any){

    const document={...data};

    if(document.draftId){
      document.draftId=
        new Types.ObjectId(
          document.draftId
        );
    }

    if(document.emailId){
      document.emailId=
        new Types.ObjectId(
          document.emailId
        );
    }

    if(document.requesterId){
      document.requesterId=
        new Types.ObjectId(
          document.requesterId
        );
    }

    if(document.reviewerId){
      document.reviewerId=
        new Types.ObjectId(
          document.reviewerId
        );
    }

    if(document.reviewedBy){
      document.reviewedBy=
        new Types.ObjectId(
          document.reviewedBy
        );
    }

    return ApprovalModel.create(
      document
    );
  }

  update(
    id:string,
    data:any
  ){

    const update={...data};

    if(update.requesterId){
      update.requesterId=
        new Types.ObjectId(
          update.requesterId
        );
    }

    if(update.reviewerId){
      update.reviewerId=
        new Types.ObjectId(
          update.reviewerId
        );
    }

    if(update.reviewedBy){
      update.reviewedBy=
        new Types.ObjectId(
          update.reviewedBy
        );
    }

    if(update.draftId){
      update.draftId=
        new Types.ObjectId(
          update.draftId
        );
    }

    if(update.emailId){
      update.emailId=
        new Types.ObjectId(
          update.emailId
        );
    }

    return ApprovalModel.findByIdAndUpdate(
      id,
      {
        $set:update,
      },
      {
        new:true,
      }
    );
  }

  delete(id:string){
    return ApprovalModel.findByIdAndDelete(id);
  }

}

export const approvalRepository=
  new ApprovalRepository();
  