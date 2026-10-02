import {Types} from "mongoose";
import EmailModel,{type EmailDocument} from "../models/Email.js";

class EmailRepository {
  findAll(userId:string){
    return EmailModel.find({userId}).sort({receivedAt:-1});
  }

  async findPage(userId:string,page=1,limit=50){
    const safePage=Math.max(1,page);
    const safeLimit=Math.min(Math.max(1,limit),100);
    const filter={userId,direction:"inbound" as const,archived:false};
    const [emails,total]=await Promise.all([
      EmailModel.find(filter).sort({receivedAt:-1}).skip((safePage-1)*safeLimit).limit(safeLimit),
      EmailModel.countDocuments(filter),
    ]);
    return {
      emails,
      total,
      page:safePage,
      limit:safeLimit,
      hasMore:safePage*safeLimit<total,
    };
  }

  async findSentPage(userId:string,page=1,limit=50){
    const safePage=Math.max(1,page);
    const safeLimit=Math.min(Math.max(1,limit),100);
    const filter={userId,direction:"outbound" as const};
    const [emails,total]=await Promise.all([
      EmailModel.find(filter).sort({receivedAt:-1}).skip((safePage-1)*safeLimit).limit(safeLimit),
      EmailModel.countDocuments(filter),
    ]);
    return {
      emails,
      total,
      page:safePage,
      limit:safeLimit,
      hasMore:safePage*safeLimit<total,
    };
  }

  findById(id:string){
    return EmailModel.findById(id);
  }

  findByMessageId(
    userId:string,
    provider:EmailDocument["provider"],
    messageId:string,
  ){
    return EmailModel.findOne({userId,provider,messageId});
  }

  findConversation(
    userId:string,
    threadId:string,
    currentEmailId?:string,
    limit=20,
  ){
    const safeLimit=Math.min(Math.max(1,limit),100);
    const filter:Record<string,unknown>={
      userId,
      threadId:threadId.trim(),
    };
    if(currentEmailId)filter._id={$ne:currentEmailId};
    return EmailModel.find(filter)
      .select("subject body senderEmail recipientEmail from receivedAt createdAt direction")
      .sort({receivedAt:-1,createdAt:-1})
      .limit(safeLimit)
      .lean();
  }

  findAllWithoutDraft(userId?:string){
    const filter:Record<string,unknown>={
      $or:[{draftId:null},{draftId:{$exists:false}}],
      direction:"inbound",
    };
    if(userId)filter.userId=userId;
    return EmailModel.find(filter).sort({receivedAt:-1});
  }

  create(data:Partial<EmailDocument>){
    return EmailModel.create(data);
  }

  upsert(messageId:string,data:Partial<EmailDocument>){
    return EmailModel.findOneAndUpdate(
      {
        userId:data.userId,
        provider:data.provider,
        messageId,
      },
      {$set:data},
      {
        returnDocument:"after",
        upsert:true,
      },
    );
  }

  async bulkUpsert(emails:Partial<EmailDocument>[]){
    const operations=emails
      .filter(email=>Boolean(email.userId&&email.provider&&email.messageId))
      .map(email=>({
        updateOne:{
          filter:{
            userId:email.userId,
            provider:email.provider,
            messageId:email.messageId,
          },
          update:{$set:email},
          upsert:true,
        },
      }));

    if(operations.length===0)return EmailModel.bulkWrite([]);
    return EmailModel.bulkWrite(operations,{ordered:false});
  }

  /**
   * Atomically claims automatic draft generation for an inbound email.
   *
   * A stale claim can be recovered after 15 minutes. The Draft unique
   * index remains the final protection if two processes ever overlap.
   */
  async claimAutomaticDraftGeneration(
    id:string,
    staleAfterMs=15*60*1000,
  ){
    if(!Types.ObjectId.isValid(id))return null;

    const cutoff=new Date(Date.now()-staleAfterMs);

    return EmailModel.findOneAndUpdate(
      {
        _id:new Types.ObjectId(id),
        direction:"inbound",
        automaticDraftGenerated:false,
        $or:[
          {automaticDraftGenerationInProgress:{$ne:true}},
          {
            automaticDraftGenerationInProgress:true,
            automaticDraftGenerationStartedAt:{$lt:cutoff},
          },
        ],
      },
      {
        $set:{
          automaticDraftGenerationInProgress:true,
          automaticDraftGenerationStartedAt:new Date(),
        },
      },
      {
        returnDocument:"after",
      },
    );
  }

  async markAutomaticDraftGenerated(
    emailId:string,
    draftId:Types.ObjectId,
  ){
    if(!Types.ObjectId.isValid(emailId))return null;

    return EmailModel.findByIdAndUpdate(
      emailId,
      {
        $set:{
          draftId,
          automaticDraftGenerated:true,
          automaticDraftGenerationInProgress:false,
        },
        $unset:{
          automaticDraftGenerationStartedAt:1,
        },
      },
      {
        returnDocument:"after",
      },
    );
  }

  async releaseAutomaticDraftGeneration(
    emailId:string,
  ){
    if(!Types.ObjectId.isValid(emailId))return null;

    return EmailModel.findOneAndUpdate(
      {
        _id:new Types.ObjectId(emailId),
        automaticDraftGenerated:false,
        automaticDraftGenerationInProgress:true,
      },
      {
        $set:{
          automaticDraftGenerationInProgress:false,
        },
        $unset:{
          automaticDraftGenerationStartedAt:1,
        },
      },
      {
        returnDocument:"after",
      },
    );
  }

  async clearDraftReference(
    emailId:string,
  ){
    if(!Types.ObjectId.isValid(emailId))return null;

    return EmailModel.findByIdAndUpdate(
      emailId,
      {
        $set:{
          draftId:null,
        },
      },
      {
        returnDocument:"after",
      },
    );
  }

  update(id:string,data:Partial<EmailDocument>){
    return EmailModel.findByIdAndUpdate(
      id,
      {$set:data},
      {
        returnDocument:"after",
      },
    );
  }

  delete(id:string){
    return EmailModel.findByIdAndDelete(id);
  }
}

export const emailRepository=new EmailRepository();
