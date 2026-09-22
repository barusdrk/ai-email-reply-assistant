import {searchKnowledgeBase} from "./knowledgeBase.js";
import {getCompanyPolicies} from "./companyPolicies.js";
import {buildCustomerContext,buildCustomerContextFromCustomer,getCustomerContextFromEmail,mergeCustomerContext,enrichCustomerContextWithHubSpot} from "./customerContext.js";
import {customerRepository} from "../repositories/CustomerRepository.js";
import {scoreReplyConfidence} from "./confidenceScoring.js";
import {checkReplyPolicy,type PolicyCheckResult} from "./policyChecker.js";
import {getConversationHistory} from "./conversationMemory.js";
import {analyzeSupportRequest,type SupportEngineResult} from "./supportEngine.js";
import {type AutomaticActionResult} from "./automaticActions.js";
import {getSourceEmail} from "./draftValidation.js";

export async function getDraftSupportContext(userId:string,emailId:string){
  const sourceEmail=await getSourceEmail(userId,emailId);
  const customerEmailBody=sourceEmail.body?.trim()||"";
  if(!customerEmailBody)throw new Error("The original customer email has no body.");
  const knowledgeBase=await searchKnowledgeBase(userId,customerEmailBody);
  const companyPolicies=await getCompanyPolicies(userId);
  const conversationHistory=sourceEmail.threadId
    ?await getConversationHistory(userId,sourceEmail.threadId,emailId)
    :[];
  const supportConversationHistory=conversationHistory.map((message)=>({
    role:message.role==="customer"?"customer" as const:"agent" as const,
    content:message.content,
    createdAt:message.timestamp??undefined,
  }));
  const emailCustomerContext=getCustomerContextFromEmail(sourceEmail);
  const persistedCustomer=emailCustomerContext.email
    ?await customerRepository.findByEmail(userId,emailCustomerContext.email)
    :null;
  const persistedCustomerContext=buildCustomerContextFromCustomer(persistedCustomer);
  let customerContext=mergeCustomerContext(persistedCustomerContext,emailCustomerContext);
  customerContext=await enrichCustomerContextWithHubSpot(userId,customerContext);
  return {
    sourceEmail,
    customerEmailBody,
    knowledgeBase,
    companyPolicies,
    conversationHistory,
    supportConversationHistory,
    customerContext,
    persistedCustomer,
  };
}

export async function analyzeDraftSupport(
  userId:string,
  emailId:string,
  customerEmail?:string,
  tone?:Parameters<typeof analyzeSupportRequest>[0]["tone"],
  length?:Parameters<typeof analyzeSupportRequest>[0]["length"],
){
  const context=await getDraftSupportContext(userId,emailId);
  let customerContext=context.customerContext;
  const suppliedCustomerContext=buildCustomerContext({email:customerEmail});
  if(suppliedCustomerContext.email&&suppliedCustomerContext.email!==customerContext.email){
    customerContext=mergeCustomerContext(customerContext,suppliedCustomerContext);
    customerContext=await enrichCustomerContextWithHubSpot(userId,customerContext);
  }else{
    customerContext=mergeCustomerContext(customerContext,suppliedCustomerContext);
  }
  const result=await analyzeSupportRequest({
    customerMessage:context.customerEmailBody,
    conversationHistory:context.supportConversationHistory,
    knowledgeBase:(context.knowledgeBase??[]).map((item)=>({
      title:item.title,
      content:item.content,
    })),
    customerContext,
    companyPolicies:context.companyPolicies,
    tone,
    length,
  });
  return {...context,customerContext,supportResult:result};
}

export async function scoreDraftConfidence(
  userId:string,
  email:string,
  reply:string,
  knowledgeBase?:Awaited<ReturnType<typeof searchKnowledgeBase>>,
){
  const customerEmail=email.trim();
  const draftReply=reply.trim();
  if(!customerEmail)throw new Error("The original customer email has no body, so the draft cannot be scored.");
  if(!draftReply)throw new Error("A reply is required.");
  const context=knowledgeBase??await searchKnowledgeBase(userId,customerEmail);
  return scoreReplyConfidence({
    email:customerEmail,
    reply:draftReply,
    knowledgeBase:context??[],
  });
}

export async function evaluateDraftPolicy(
  userId:string,
  email:string,
  reply:string,
  knowledgeBase?:Awaited<ReturnType<typeof searchKnowledgeBase>>,
):Promise<PolicyCheckResult>{
  const customerEmail=email.trim();
  const draftReply=reply.trim();
  if(!customerEmail)throw new Error("The original customer email has no body, so the reply cannot be policy checked.");
  if(!draftReply)throw new Error("A reply is required.");
  const context=knowledgeBase??await searchKnowledgeBase(userId,customerEmail);
  return checkReplyPolicy({
    email:customerEmail,
    reply:draftReply,
    knowledgeBase:context??[],
  });
}

export function applySupportDecision(
  result:AutomaticActionResult,
  supportResult:SupportEngineResult,
):AutomaticActionResult{
  if(result.action==="blocked")return result;
  const reasons=[
    supportResult.reason,
    ...supportResult.missingInformation,
    ...supportResult.policyIssues,
  ].filter(Boolean);
  if(supportResult.policyIssues.length>0){
    return {
      action:"blocked",
      reasons:supportResult.policyIssues,
    };
  }
  if(supportResult.decision==="reject"){
    return {
      action:"blocked",
      reasons:reasons.length
        ?reasons
        :["The AI customer-support engine rejected the request for automated handling."],
    };
  }
  if(result.action==="escalate"){
    return {
      action:"escalate",
      reasons:result.reasons.length
        ?result.reasons
        :reasons.length
          ?reasons
          :["The request requires human specialist review."],
    };
  }
  if(supportResult.decision==="human_review"||supportResult.needsHuman||!supportResult.reply.trim()){
    return {
      action:"pending",
      reasons:reasons.length
        ?reasons
        :["Human approval is required before the response can be sent."],
    };
  }
  if(result.action==="auto_approve"&&supportResult.decision==="reply"){
    return {
      action:"auto_approve",
      reasons:result.reasons.length
        ?result.reasons
        :["The request passed the AI customer-support decision checks."],
    };
  }
  if(result.action==="pending"){
    return {
      action:"pending",
      reasons:result.reasons.length
        ?result.reasons
        :["Human approval is required before the response can be sent."],
    };
  }
  return {
    action:"pending",
    reasons:reasons.length
      ?reasons
      :["Human approval is required before the response can be sent."],
  };
}
