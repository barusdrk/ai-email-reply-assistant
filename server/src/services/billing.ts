import {Types} from "mongoose";
import {subscriptionRepository} from "../repositories/SubscriptionRepository.js";
import {aiSettingsRepository} from "../repositories/AISettingsRepository.js";
import {env} from "../config/env.js";

export type Plan="free"|"starter"|"pro"|"business";
export type AIProvider="openai"|"gemini"|"groq"|"claude";

export interface PlanLimits{
  monthlyReplies:number;
  dailyReplies:number;
  emailIntegrations:number;
  knowledgeBase:boolean;
  automaticHandling:boolean;
  conversationMemory:boolean;
  crmIntegration:boolean;
  advancedAnalytics:boolean;
  customPolicies:boolean;
}

const PLAN_LIMITS:Record<Plan,PlanLimits>={
  free:{
    monthlyReplies:100,
    dailyReplies:env.FREE_DAILY_LIMIT,
    emailIntegrations:1,
    knowledgeBase:false,
    automaticHandling:false,
    conversationMemory:false,
    crmIntegration:false,
    advancedAnalytics:false,
    customPolicies:false,
  },
  starter:{
    monthlyReplies:1000,
    dailyReplies:env.STARTER_DAILY_LIMIT,
    emailIntegrations:2,
    knowledgeBase:true,
    automaticHandling:true,
    conversationMemory:true,
    crmIntegration:false,
    advancedAnalytics:false,
    customPolicies:false,
  },
  pro:{
    monthlyReplies:10000,
    dailyReplies:env.PRO_DAILY_LIMIT,
    emailIntegrations:5,
    knowledgeBase:true,
    automaticHandling:true,
    conversationMemory:true,
    crmIntegration:true,
    advancedAnalytics:true,
    customPolicies:true,
  },
  business:{
    monthlyReplies:Infinity,
    dailyReplies:Infinity,
    emailIntegrations:Infinity,
    knowledgeBase:true,
    automaticHandling:true,
    conversationMemory:true,
    crmIntegration:true,
    advancedAnalytics:true,
    customPolicies:true,
  },
};

function normalizePlan(value:unknown):Plan{
  if(value==="free"||value==="starter"||value==="pro"||value==="business")return value;
  return "free";
}

function serializeSubscription(subscription:any){
  return {
    id:subscription._id?.toString()??"",
    plan:normalizePlan(subscription.plan),
    status:subscription.status,
    provider:subscription.provider,
    currentPeriodStart:subscription.currentPeriodStart?.toISOString?.(),
    currentPeriodEnd:subscription.currentPeriodEnd?.toISOString?.(),
    dailyReplyCount:subscription.dailyReplyCount??0,
    monthlyReplyCount:subscription.monthlyReplyCount??0,
    dailyReplyReserved:subscription.dailyReplyReserved??0,
    monthlyReplyReserved:subscription.monthlyReplyReserved??0,
    dailyReplyResetAt:subscription.dailyReplyResetAt?.toISOString?.(),
    monthlyReplyResetAt:subscription.monthlyReplyResetAt?.toISOString?.(),
  };
}

export async function getSubscription(userId:string){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

  let subscription=await subscriptionRepository.findByUser(userId);

  if(!subscription){
    subscription=await subscriptionRepository.create({
      userId:new Types.ObjectId(userId),
      plan:"free",
      status:"active",
      provider:"none",
      dailyReplyCount:0,
      monthlyReplyCount:0,
      dailyReplyReserved:0,
      monthlyReplyReserved:0,
    });
  }

  return serializeSubscription(subscription);
}

export async function getPlan(userId:string):Promise<Plan>{
  const subscription=await getSubscription(userId);
  return subscription.plan;
}

export async function getAIProvider(userId:string):Promise<AIProvider>{
  const settings=await aiSettingsRepository.findByUser(userId);
  const provider=settings?.provider;

  if(provider==="gemini"||provider==="groq"||provider==="claude")return provider;

  return "openai";
}

export function getPlanLimits(plan:Plan):PlanLimits{
  return PLAN_LIMITS[plan]??PLAN_LIMITS.free;
}

export async function changePlan(userId:string,plan:Plan){
  const existing=await subscriptionRepository.findByUser(userId);

  const subscription=await subscriptionRepository.update(userId,{
    plan,
    status:"active",
    provider:plan==="free"?"none":existing?.provider??"none",
    dailyReplyCount:0,
    monthlyReplyCount:0,
    dailyReplyReserved:0,
    monthlyReplyReserved:0,
    dailyReplyResetAt:new Date(),
    monthlyReplyResetAt:new Date(),
  });

  return serializeSubscription(subscription);
}

export async function canGenerateReply(userId:string):Promise<boolean>{
  if(!Types.ObjectId.isValid(userId))return false;

  const subscription=await subscriptionRepository.findByUser(userId);

  if(!subscription||subscription.status!=="active")return false;

  const plan=normalizePlan(subscription.plan);
  const limits=getPlanLimits(plan);

  return limits.monthlyReplies>0&&limits.dailyReplies>0;
}

export async function reserveReplyAllowance(userId:string):Promise<string|null>{
  if(!Types.ObjectId.isValid(userId))return null;

  const subscription=await getSubscription(userId);
  if(subscription.status!=="active")return null;

  const plan=normalizePlan(subscription.plan);
  const limits=getPlanLimits(plan);

  if(limits.monthlyReplies<=0||limits.dailyReplies<=0)return null;

  return subscriptionRepository.reserveReplyAllowance(
    userId,
    limits.dailyReplies,
    limits.monthlyReplies
  );
}

export async function finalizeReplyAllowance(userId:string,reservationId:string):Promise<boolean>{
  return subscriptionRepository.finalizeReplyAllowance(userId,reservationId);
}

export async function releaseReplyAllowance(userId:string,reservationId:string):Promise<boolean>{
  return subscriptionRepository.releaseReplyAllowance(userId,reservationId);
}

export async function setPlan(
  userId:string,
  plan:Plan,
  subscriptionId?:string,
  status:"active"|"cancelled"|"expired"="active"
){
  const existing=await subscriptionRepository.findByUser(userId);

  const subscription=await subscriptionRepository.update(userId,{
    plan,
    status,
    provider:plan==="free"?"none":"stripe",
    ...(subscriptionId?{subscriptionId}:{}),
    ...(existing?.customerId?{customerId:existing.customerId}:{}),
  });

  return serializeSubscription(subscription);
}
