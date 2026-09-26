import {Types} from "mongoose";
import SupportAnalyticsEventModel,{type SupportAnalyticsEventDocument,type SupportAnalyticsEvent} from "../models/SupportAnalyticsEvent.js";

export interface SupportAnalyticsEventInput{
  userId:string;
  emailId:string;
  draftId?:string|null;
  customerId?:string|null;
  provider:"gmail"|"outlook";
  category?:SupportAnalyticsEvent["category"];
  confidenceScore?:number|null;
  confidenceLevel?:SupportAnalyticsEvent["confidenceLevel"];
  policyCompliant?:boolean;
  policyViolationCount?:number;
  automaticAction:SupportAnalyticsEvent["automaticAction"];
  outcome:SupportAnalyticsEvent["outcome"];
  supportDecision?:SupportAnalyticsEvent["supportDecision"];
  supportNeedsHuman?:boolean;
  createdAt?:Date;
}

export interface SupportAnalyticsSummary{
  total:number;
  autoApproved:number;
  pending:number;
  escalated:number;
  blocked:number;
  autoSent:number;
  approved:number;
  rejected:number;
  failed:number;
  averageConfidence:number|null;
  highConfidence:number;
  mediumConfidence:number;
  lowConfidence:number;
  policyViolations:number;
  automationRate:number;
}

export interface SupportAnalyticsCategory{
  category:string;
  count:number;
}

export interface SupportAnalyticsConfidence{
  level:string;
  count:number;
}

class SupportAnalyticsRepository{
  async create(data:SupportAnalyticsEventInput):Promise<SupportAnalyticsEventDocument>{
    if(!Types.ObjectId.isValid(data.userId))throw new Error("Invalid user ID.");
    if(!Types.ObjectId.isValid(data.emailId))throw new Error("Invalid email ID.");
    if(data.draftId&&!Types.ObjectId.isValid(data.draftId))throw new Error("Invalid draft ID.");
    if(data.customerId&&!Types.ObjectId.isValid(data.customerId))throw new Error("Invalid customer ID.");

    return SupportAnalyticsEventModel.create({
      userId:new Types.ObjectId(data.userId),
      emailId:new Types.ObjectId(data.emailId),
      draftId:data.draftId?new Types.ObjectId(data.draftId):null,
      customerId:data.customerId?new Types.ObjectId(data.customerId):null,
      provider:data.provider,
      category:data.category??"general_support",
      confidenceScore:data.confidenceScore??null,
      confidenceLevel:data.confidenceLevel??null,
      policyCompliant:data.policyCompliant??true,
      policyViolationCount:data.policyViolationCount??0,
      automaticAction:data.automaticAction,
      outcome:data.outcome,
      supportDecision:data.supportDecision??null,
      supportNeedsHuman:data.supportNeedsHuman??false,
      createdAt:data.createdAt??new Date(),
    });
  }

  async getSummary(userId:string,from?:Date,to?:Date):Promise<SupportAnalyticsSummary>{
    if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

    const match:Record<string,unknown>={
      userId:new Types.ObjectId(userId),
    };

    if(from||to){
      match.createdAt={};
      if(from)(match.createdAt as Record<string,Date>).$gte=from;
      if(to)(match.createdAt as Record<string,Date>).$lt=to;
    }

    const [result]=await SupportAnalyticsEventModel.aggregate([
      {$match:match},
      {$group:{
        _id:null,
        total:{$sum:1},
        autoApproved:{$sum:{$cond:[{$eq:["$automaticAction","auto_approve"]},1,0]}},
        pending:{$sum:{$cond:[{$eq:["$automaticAction","pending"]},1,0]}},
        escalated:{$sum:{$cond:[{$eq:["$automaticAction","escalate"]},1,0]}},
        blocked:{$sum:{$cond:[{$eq:["$automaticAction","blocked"]},1,0]}},
        autoSent:{$sum:{$cond:[{$eq:["$outcome","auto_sent"]},1,0]}},
        approved:{$sum:{$cond:[{$eq:["$outcome","approved"]},1,0]}},
        rejected:{$sum:{$cond:[{$eq:["$outcome","rejected"]},1,0]}},
        failed:{$sum:{$cond:[{$eq:["$outcome","failed"]},1,0]}},
        averageConfidence:{$avg:"$confidenceScore"},
        highConfidence:{$sum:{$cond:[{$eq:["$confidenceLevel","high"]},1,0]}},
        mediumConfidence:{$sum:{$cond:[{$eq:["$confidenceLevel","medium"]},1,0]}},
        lowConfidence:{$sum:{$cond:[{$eq:["$confidenceLevel","low"]},1,0]}},
        policyViolations:{$sum:"$policyViolationCount"},
      }},
    ]);

    const total=Number(result?.total??0);
    const autoSent=Number(result?.autoSent??0);
    const humanApproved=Number(result?.approved??0);

    return {
      total,
      autoApproved:Number(result?.autoApproved??0),
      pending:Number(result?.pending??0),
      escalated:Number(result?.escalated??0),
      blocked:Number(result?.blocked??0),
      autoSent,
      approved:humanApproved,
      rejected:Number(result?.rejected??0),
      failed:Number(result?.failed??0),
      averageConfidence:result?.averageConfidence==null
        ?null
        :Number(Number(result.averageConfidence).toFixed(2)),
      highConfidence:Number(result?.highConfidence??0),
      mediumConfidence:Number(result?.mediumConfidence??0),
      lowConfidence:Number(result?.lowConfidence??0),
      policyViolations:Number(result?.policyViolations??0),
      automationRate:total===0
        ?0
        :Number(((autoSent+humanApproved)/total*100).toFixed(2)),
    };
  }

  async getCategoryBreakdown(userId:string,from?:Date,to?:Date):Promise<SupportAnalyticsCategory[]>{
    if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

    const match:Record<string,unknown>={
      userId:new Types.ObjectId(userId),
    };

    if(from||to){
      match.createdAt={};
      if(from)(match.createdAt as Record<string,Date>).$gte=from;
      if(to)(match.createdAt as Record<string,Date>).$lt=to;
    }

    const results=await SupportAnalyticsEventModel.aggregate([
      {$match:match},
      {$group:{_id:"$category",count:{$sum:1}}},
      {$project:{_id:0,category:"$_id",count:1}},
      {$sort:{count:-1,category:1}},
    ]);

    return results.map((item)=>({
      category:String(item.category),
      count:Number(item.count),
    }));
  }

  async getConfidenceBreakdown(userId:string,from?:Date,to?:Date):Promise<SupportAnalyticsConfidence[]>{
    if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

    const match:Record<string,unknown>={
      userId:new Types.ObjectId(userId),
      confidenceLevel:{$ne:null},
    };

    if(from||to){
      match.createdAt={};
      if(from)(match.createdAt as Record<string,Date>).$gte=from;
      if(to)(match.createdAt as Record<string,Date>).$lt=to;
    }

    const results=await SupportAnalyticsEventModel.aggregate([
      {$match:match},
      {$group:{_id:"$confidenceLevel",count:{$sum:1}}},
      {$project:{_id:0,level:"$_id",count:1}},
    ]);

    const order=["high","medium","low"];

    return results
      .map((item)=>({
        level:String(item.level),
        count:Number(item.count),
      }))
      .sort((a,b)=>order.indexOf(a.level)-order.indexOf(b.level));
  }
}

export const supportAnalyticsRepository=new SupportAnalyticsRepository();
