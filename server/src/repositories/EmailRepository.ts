import EmailModel,{
  type EmailDocument,
} from "../models/Email.js";

class EmailRepository {

  findAll(userId:string){
    return EmailModel
      .find({userId})
      .sort({receivedAt:-1});
  }

  findById(id:string){
    return EmailModel.findById(id);
  }

  findAllWithoutDraft(){
    return EmailModel.find({
      $or:[
        {draftId:null},
        {draftId:{$exists:false}},
      ],
    });
  }

  create(
    data:Partial<EmailDocument>
  ){
    return EmailModel.create(data);
  }

  upsert(
    messageId:string,
    data:Partial<EmailDocument>
  ){
    return EmailModel.findOneAndUpdate(
      {messageId},
      {$set:data},
      {
        new:true,
        upsert:true,
      }
    );
  }

  update(
    id:string,
    data:Partial<EmailDocument>
  ){
    return EmailModel.findByIdAndUpdate(
      id,
      {$set:data},
      {new:true}
    );
  }

  delete(id:string){
    return EmailModel.findByIdAndDelete(id);
  }

}

export const emailRepository =
  new EmailRepository();
