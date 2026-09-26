import {Types} from "mongoose";
import {supportAnalyticsRepository,type SupportAnalyticsEventInput,type SupportAnalyticsSummary,type SupportAnalyticsCategory,type SupportAnalyticsConfidence} from "../repositories/SupportAnalyticsRepository.js";

export interface RecordSupportAnalyticsInput extends Omit<SupportAnalyticsEventInput,"userId">{
  userId:string;
}

export interface SupportAnalyticsResult{
  summary:SupportAnalyticsSummary;
  categories:SupportAnalyticsCategory[];
  confidence:SupportAnalyticsConfidence[];
  period:{
    from:string|null;
    to:string|null;
  };
}

function parseDate(value:unknown,name:string):Date|undefined{
  if(value===undefined||value===null||value==="")return undefined;
  if(typeof value!=="string")throw new Error(`Invalid ${name} date.`);
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))throw new Error(`Invalid ${name} date.`);
  return date;
}

function validatePeriod(from?:Date,to?:Date):void{
  if(from&&to&&from>=to)throw new Error("The from date must be earlier than the to date.");
}

export async function recordSupportAnalyticsEvent(data:RecordSupportAnalyticsInput){
  if(!Types.ObjectId.isValid(data.userId))throw new Error("Invalid user ID.");
  if(!Types.ObjectId.isValid(data.emailId))throw new Error("Invalid email ID.");
  return supportAnalyticsRepository.create(data);
}

export async function recordDraftAnalytics(data:{
  userId:string;
  emailId:string;
  draftId:string;
  customerId?:string|null;
  provider:"gmail"|"outlook";
  category?:RecordSupportAnalyticsInput["category"];
  confidenceScore?:number|null;
  confidenceLevel?:RecordSupportAnalyticsInput["confidenceLevel"];
  policyCompliant?:boolean;
  policyViolationCount?:number;
  automaticAction:RecordSupportAnalyticsInput["automaticAction"];
  supportDecision?:RecordSupportAnalyticsInput["supportDecision"];
  supportNeedsHuman?:boolean;
  outcome:RecordSupportAnalyticsInput["outcome"];
}){
  return recordSupportAnalyticsEvent({
    userId:data.userId,
    emailId:data.emailId,
    draftId:data.draftId,
    customerId:data.customerId,
    provider:data.provider,
    category:data.category,
    confidenceScore:data.confidenceScore,
    confidenceLevel:data.confidenceLevel,
    policyCompliant:data.policyCompliant,
    policyViolationCount:data.policyViolationCount,
    automaticAction:data.automaticAction,
    outcome:data.outcome,
    supportDecision:data.supportDecision,
    supportNeedsHuman:data.supportNeedsHuman,
  });
}

export async function getSupportAnalytics(userId:string,from?:Date,to?:Date):Promise<SupportAnalyticsResult>{
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  validatePeriod(from,to);

  const [summary,categories,confidence]=await Promise.all([
    supportAnalyticsRepository.getSummary(userId,from,to),
    supportAnalyticsRepository.getCategoryBreakdown(userId,from,to),
    supportAnalyticsRepository.getConfidenceBreakdown(userId,from,to),
  ]);

  return {
    summary,
    categories,
    confidence,
    period:{
      from:from?.toISOString()??null,
      to:to?.toISOString()??null,
    },
  };
}

export async function getSupportAnalyticsFromQuery(userId:string,fromValue?:unknown,toValue?:unknown){
  const from=parseDate(fromValue,"from");
  const to=parseDate(toValue,"to");
  return getSupportAnalytics(userId,from,to);
}
