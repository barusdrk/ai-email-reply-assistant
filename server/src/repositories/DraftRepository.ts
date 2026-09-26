import {Types} from "mongoose";
import DraftModel,{type Draft,type DraftStatus} from "../models/Draft.js";

class DraftRepository {
  async findAll(userId:string,status?:DraftStatus):Promise<Draft[]>{
    const filter:{userId:Types.ObjectId;status?:DraftStatus}={userId:new Types.ObjectId(userId)};
    if(status)filter.status=status;
    return DraftModel.find(filter).sort({createdAt:-1}).lean<Draft[]>();
  }

  async findById(id:string):Promise<Draft|null>{
    if(!Types.ObjectId.isValid(id))return null;
    return DraftModel.findById(id).lean<Draft|null>();
  }

  async findByEmailId(emailId:string):Promise<Draft|null>{
    if(!Types.ObjectId.isValid(emailId))return null;
    return DraftModel.findOne({emailId:new Types.ObjectId(emailId)}).sort({createdAt:-1}).lean<Draft|null>();
  }

  async create(data:Partial<Draft>):Promise<Draft>{
    const draft=await DraftModel.create(data);
    return draft.toObject() as Draft;
  }

  async update(id:string,data:Partial<Draft>):Promise<Draft|null>{
    if(!Types.ObjectId.isValid(id))return null;
    return DraftModel.findByIdAndUpdate(id,{$set:data},{new:true,runValidators:true}).lean<Draft|null>();
  }

  async delete(id:string):Promise<Draft|null>{
    if(!Types.ObjectId.isValid(id))return null;
    return DraftModel.findOneAndDelete({
      _id:new Types.ObjectId(id),
      automaticSendInProgress:{$ne:true},
    }).lean<Draft|null>();
  }

  async claimForAutomaticSend(id:string,userId:string):Promise<Draft|null>{
    if(!Types.ObjectId.isValid(id)||!Types.ObjectId.isValid(userId))return null;
    return DraftModel.findOneAndUpdate(
      {
        _id:new Types.ObjectId(id),
        userId:new Types.ObjectId(userId),
        status:"approved",
        automaticAction:"auto_approve",
        automaticSendInProgress:{$ne:true},
        automaticSendRecoveryRequired:{$ne:true},
      },
      {
        $set:{
          automaticSendInProgress:true,
          automaticSendPhase:"claimed",
          automaticSendClaimedAt:new Date(),
          automaticSendLastAttemptAt:new Date(),
          automaticSendLastError:"",
        },
        $inc:{
          automaticSendAttempts:1,
        },
      },
      {
        new:true,
        runValidators:true,
      },
    ).lean<Draft|null>();
  }

  async markAutomaticSendStarted(id:string):Promise<Draft|null>{
    if(!Types.ObjectId.isValid(id))return null;
    return DraftModel.findOneAndUpdate(
      {
        _id:new Types.ObjectId(id),
        automaticSendInProgress:true,
        automaticSendPhase:"claimed",
      },
      {
        $set:{
          automaticSendPhase:"sending",
          automaticSendStartedAt:new Date(),
          automaticSendLastAttemptAt:new Date(),
        },
      },
      {
        new:true,
        runValidators:true,
      },
    ).lean<Draft|null>();
  }

  async markAutomaticSendCompleted(id:string,sentAt:Date):Promise<Draft|null>{
    if(!Types.ObjectId.isValid(id))return null;
    return DraftModel.findOneAndUpdate(
      {
        _id:new Types.ObjectId(id),
        automaticSendInProgress:true,
        automaticSendPhase:"sending",
      },
      {
        $set:{
          status:"sent",
          sentAt,
          automaticSendInProgress:false,
          automaticSendPhase:"completed",
          automaticSendRecoveryRequired:false,
          automaticSendLastError:"",
        },
        $unset:{
          automaticSendClaimedAt:1,
          automaticSendStartedAt:1,
        },
      },
      {
        new:true,
        runValidators:true,
      },
    ).lean<Draft|null>();
  }

  async releaseAutomaticClaim(id:string,errorMessage?:string):Promise<Draft|null>{
    if(!Types.ObjectId.isValid(id))return null;
    return DraftModel.findOneAndUpdate(
      {
        _id:new Types.ObjectId(id),
        automaticSendInProgress:true,
        automaticSendPhase:"claimed",
      },
      {
        $set:{
          status:"approved",
          automaticSendInProgress:false,
          automaticSendPhase:"failed",
          automaticSendLastError:errorMessage??"",
          automaticSendRecoveryRequired:false,
        },
        $unset:{
          automaticSendClaimedAt:1,
          automaticSendStartedAt:1,
        },
      },
      {
        new:true,
        runValidators:true,
      },
    ).lean<Draft|null>();
  }

  async markAutomaticRecoveryRequired(id:string,errorMessage:string):Promise<Draft|null>{
    if(!Types.ObjectId.isValid(id))return null;
    return DraftModel.findOneAndUpdate(
      {
        _id:new Types.ObjectId(id),
        automaticSendInProgress:true,
      },
      {
        $set:{
          status:"pending",
          automaticAction:"pending",
          automaticSendInProgress:false,
          automaticSendPhase:"recovery_required",
          automaticSendLastError:errorMessage,
          automaticSendRecoveryRequired:true,
          supportNeedsHuman:true,
          supportReason:"Automatic sending may have reached the email provider but completion could not be confirmed. Verify the provider Sent folder before retrying.",
        },
        $unset:{
          automaticSendClaimedAt:1,
          automaticSendStartedAt:1,
        },
      },
      {
        new:true,
        runValidators:true,
      },
    ).lean<Draft|null>();
  }

    async findStaleAutomaticClaims(cutoff:Date):Promise<Draft[]>{
    return DraftModel.find({
      automaticSendInProgress:true,
      $or:[
        {
          automaticSendPhase:"claimed",
          automaticSendClaimedAt:{$lt:cutoff},
        },
        {
          automaticSendPhase:"sending",
          automaticSendStartedAt:{$lt:cutoff},
        },
      ],
    }).sort({automaticSendLastAttemptAt:1}).lean<Draft[]>();
  }

  async deleteOlderThan(date:Date):Promise<number>{
    const result=await DraftModel.deleteMany({
      createdAt:{$lt:date},
      automaticSendInProgress:{$ne:true},
      automaticSendRecoveryRequired:{$ne:true},
    });
    return result.deletedCount??0;
  }
}

export const draftRepository=new DraftRepository();
