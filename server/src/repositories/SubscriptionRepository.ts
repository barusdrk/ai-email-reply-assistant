import {Types} from "mongoose";
import {randomUUID} from "node:crypto";
import SubscriptionModel,{type SubscriptionDocument} from "../models/Subscription.js";

function endOfUtcDay(date:Date):Date{
  const value=new Date(date);
  value.setUTCHours(23,59,59,999);
  return value;
}

function endOfUtcMonth(date:Date):Date{
  const value=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0,23,59,59,999));
  return value;
}

class SubscriptionRepository{
  findByUser(userId:string){
    return SubscriptionModel.findOne({userId:new Types.ObjectId(userId)});
  }

  create(data:Partial<SubscriptionDocument>){
    return SubscriptionModel.create(data);
  }

  update(userId:string,data:Partial<SubscriptionDocument>){
    return SubscriptionModel.findOneAndUpdate(
      {userId:new Types.ObjectId(userId)},
      {$set:data},
      {new:true,upsert:true,setDefaultsOnInsert:true}
    );
  }

  updateBySubscriptionId(subscriptionId:string,data:Partial<SubscriptionDocument>){
    return SubscriptionModel.findOneAndUpdate(
      {subscriptionId},
      {$set:data},
      {new:true}
    );
  }

  delete(userId:string){
    return SubscriptionModel.findOneAndDelete({
      userId:new Types.ObjectId(userId),
    });
  }

  async reserveReplyAllowance(userId:string,dailyLimit:number,monthlyLimit:number):Promise<string|null>{
    if(!Types.ObjectId.isValid(userId))return null;
    const objectId=new Types.ObjectId(userId);

    for(let attempt=0;attempt<5;attempt++){
      const now=new Date();
      const subscription=await SubscriptionModel.findOne({
        _id:{$exists:true},
        userId:objectId,
      }).lean();

      if(!subscription||subscription.status!=="active")return null;

      const dailyExpired=!subscription.dailyReplyResetAt||subscription.dailyReplyResetAt<=now;
      const monthlyExpired=!subscription.monthlyReplyResetAt||subscription.monthlyReplyResetAt<=now;

      if(dailyExpired||monthlyExpired){
        const resetData:Record<string,unknown>={};
        if(dailyExpired){
          resetData.dailyReplyCount=0;
          resetData.dailyReplyReserved=0;
          resetData.dailyReplyResetAt=endOfUtcDay(now);
        }
        if(monthlyExpired){
          resetData.monthlyReplyCount=0;
          resetData.monthlyReplyReserved=0;
          resetData.monthlyReplyResetAt=endOfUtcMonth(now);
        }

        await SubscriptionModel.updateOne(
          {
            _id:subscription._id,
            userId:objectId,
            status:"active",
          },
          {$set:resetData}
        );

        continue;
      }

      const reservationId=randomUUID();
      const filter:Record<string,unknown>={
        _id:subscription._id,
        userId:objectId,
        status:"active",
        dailyReplyResetAt:{$gt:now},
        monthlyReplyResetAt:{$gt:now},
      };

      const expressions=[];

      if(Number.isFinite(dailyLimit)){
        expressions.push({
          $lt:[
            {$add:["$dailyReplyCount","$dailyReplyReserved"]},
            dailyLimit,
          ],
        });
      }

      if(Number.isFinite(monthlyLimit)){
        expressions.push({
          $lt:[
            {$add:["$monthlyReplyCount","$monthlyReplyReserved"]},
            monthlyLimit,
          ],
        });
      }

      if(expressions.length===1){
        filter.$expr=expressions[0];
      }else if(expressions.length>1){
        filter.$expr={$and:expressions};
      }

      const updated=await SubscriptionModel.findOneAndUpdate(
        filter,
        {
          $inc:{
            dailyReplyReserved:1,
            monthlyReplyReserved:1,
          },
          $push:{
            replyReservations:{
              id:reservationId,
              createdAt:now,
            },
          },
        },
        {new:true}
      ).lean();

      if(updated)return reservationId;
    }

    return null;
  }

  async finalizeReplyAllowance(userId:string,reservationId:string):Promise<boolean>{
    if(!Types.ObjectId.isValid(userId)||!reservationId)return false;

    const updated=await SubscriptionModel.findOneAndUpdate(
      {
        userId:new Types.ObjectId(userId),
        "replyReservations.id":reservationId,
      },
      {
        $inc:{
          dailyReplyCount:1,
          monthlyReplyCount:1,
          dailyReplyReserved:-1,
          monthlyReplyReserved:-1,
        },
        $pull:{
          replyReservations:{id:reservationId},
        },
      },
      {new:true}
    );

    return Boolean(updated);
  }

  async releaseReplyAllowance(userId:string,reservationId:string):Promise<boolean>{
    if(!Types.ObjectId.isValid(userId)||!reservationId)return false;

    const updated=await SubscriptionModel.findOneAndUpdate(
      {
        userId:new Types.ObjectId(userId),
        "replyReservations.id":reservationId,
      },
      {
        $inc:{
          dailyReplyReserved:-1,
          monthlyReplyReserved:-1,
        },
        $pull:{
          replyReservations:{id:reservationId},
        },
      },
      {new:true}
    );

    return Boolean(updated);
  }
}

export const subscriptionRepository=new SubscriptionRepository();
