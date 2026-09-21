import type {DeleteResult} from "mongodb";
import DraftModel,{type Draft,type DraftStatus} from "../models/Draft.js";

class DraftRepository {
  findAll(userId:string,status?:DraftStatus){
    const filter:{userId:string;status?:DraftStatus}={userId};
    if(status)filter.status=status;
    return DraftModel.find(filter).sort({createdAt:-1});
  }

  findById(id:string){
    return DraftModel.findById(id);
  }

  findByEmailId(emailId:string){
    return DraftModel.findOne({emailId}).sort({createdAt:-1});
  }

  create(data:Partial<Draft>){
    return DraftModel.create(data);
  }

  update(id:string,data:Partial<Draft>){
    return DraftModel.findByIdAndUpdate(id,{$set:data},{new:true,runValidators:true});
  }

  async claimForAutomaticSend(id:string,userId:string){
    return DraftModel.findOneAndUpdate(
      {
        _id:id,
        userId,
        status:"approved",
        automaticAction:"auto_approve",
        automaticSendInProgress:{$ne:true},
      },
      {
        $set:{
          automaticSendInProgress:true,
        },
      },
      {
        new:true,
        runValidators:true,
      },
    );
  }

  delete(id:string){
    return DraftModel.findByIdAndDelete(id);
  }

  deleteOlderThan(date:Date):Promise<DeleteResult>{
    return DraftModel.deleteMany({createdAt:{$lt:date}});
  }
}

export const draftRepository=new DraftRepository();
