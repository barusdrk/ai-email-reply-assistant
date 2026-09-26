export type SupportTone="friendly"|"formal"|"concise"|"professional"|"empathetic"|"enthusiastic";
export type SupportLength="short"|"medium"|"long";
export type SupportDecision="reply"|"human_review"|"reject";
export type SupportSentiment="positive"|"neutral"|"negative"|"urgent";

export interface ConversationMessage{
  role:"customer"|"agent";
  content:string;
  createdAt?:Date;
}

export interface KnowledgeBaseItem{
  title:string;
  content:string;
}

export interface CustomerContext{
  name?:string;
  email?:string;
  plan?:string;
  status?:string;
  accountId?:string;
  metadata?:Record<string,unknown>;
}

export interface SupportPolicy{
  refundPolicy?:string;
  cancellationPolicy?:string;
  escalationPolicy?:string;
  allowedActions?:string[];
  restrictedActions?:string[];
  customInstructions?:string;
}

export interface SupportEngineInput{
  customerMessage:string;
  conversationHistory?:ConversationMessage[];
  knowledgeBase?:KnowledgeBaseItem[];
  customerContext?:CustomerContext;
  tone?:SupportTone;
  length?:SupportLength;
  companyPolicies?:SupportPolicy;
}

export interface SupportEngineResult{
  decision:SupportDecision;
  confidence:number;
  category:string;
  sentiment:SupportSentiment;
  needsHuman:boolean;
  reason:string;
  reply:string;
  suggestedActions:string[];
  missingInformation:string[];
  policyIssues:string[];
}

export interface SupportEngineResultInput{
  decision?:SupportDecision|string;
  confidence?:number;
  category?:string;
  sentiment?:SupportSentiment|string;
  needsHuman?:boolean;
  reason?:string;
  reply?:string;
  suggestedActions?:unknown;
  missingInformation?:unknown;
  policyIssues?:unknown;
}

export const DEFAULT_TONE:SupportTone="professional";
export const DEFAULT_LENGTH:SupportLength="medium";
export const CONFIDENCE_THRESHOLD=0.75;
export const MAX_MESSAGE_LENGTH=12000;
export const MAX_HISTORY_MESSAGES=20;
export const MAX_HISTORY_MESSAGE_LENGTH=6000;
export const MAX_KNOWLEDGE_ITEMS=20;
export const MAX_KNOWLEDGE_LENGTH=8000;
export const MAX_REPLY_LENGTH=12000;

export function clampConfidence(value:unknown):number{
  const confidence=Number(value);
  if(!Number.isFinite(confidence))return 0;
  return Math.max(0,Math.min(1,confidence));
}

export function cleanText(value:unknown):string{
  return typeof value==="string"?value.trim():"";
}

export function limitText(value:unknown,maxLength:number):string{
  return cleanText(value).slice(0,maxLength);
}

export function cleanStringArray(value:unknown,maxItems=20):string[]{
  if(!Array.isArray(value))return [];
  return value
    .map((item)=>cleanText(item))
    .filter(Boolean)
    .slice(0,maxItems);
}

export function normalizeResult(result:SupportEngineResultInput):SupportEngineResult{
  const confidence=clampConfidence(result.confidence??0);
  const reply=limitText(result.reply??"",MAX_REPLY_LENGTH);
  const requestedDecision=result.decision;
  const policyIssues=cleanStringArray(result.policyIssues);
  const missingInformation=cleanStringArray(result.missingInformation);
  const suggestedActions=cleanStringArray(result.suggestedActions);

  const validDecision=
    requestedDecision==="reply"||
    requestedDecision==="human_review"||
    requestedDecision==="reject";

  let decision:SupportDecision;

  if(requestedDecision==="human_review"||requestedDecision==="reject"){
    decision="human_review";
  }else if(
    !validDecision||
    confidence<CONFIDENCE_THRESHOLD||
    policyIssues.length>0||
    !reply
  ){
    decision="human_review";
  }else{
    decision="reply";
  }

  const category=
    typeof result.category==="string"&&[
      "account",
      "billing",
      "cancellation",
      "complaint",
      "feature_request",
      "refund",
      "shipping",
      "technical",
      "product",
      "general_support",
    ].includes(result.category)
      ?result.category
      :"general_support";

  const sentiment:SupportSentiment=
    result.sentiment==="positive"||
    result.sentiment==="negative"||
    result.sentiment==="urgent"||
    result.sentiment==="neutral"
      ?result.sentiment
      :"neutral";

  const needsHuman=
    result.needsHuman===true||
    decision==="human_review";

  const normalizedReply=
    decision==="human_review"
      ?""
      :reply;

  const reason=
    cleanText(result.reason??"")||
    (
      decision==="human_review"
        ?"The request requires human review."
        :"The response is ready to send."
    );

  return {
    decision,
    confidence,
    category,
    sentiment,
    needsHuman,
    reason,
    reply:normalizedReply,
    suggestedActions,
    missingInformation,
    policyIssues,
  };
}

export function buildPrompt(input:SupportEngineInput):string{
  const tone=input.tone??DEFAULT_TONE;
  const length=input.length??DEFAULT_LENGTH;
  const history=(input.conversationHistory??[])
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message)=>({
      role:message.role,
      content:limitText(message.content,MAX_HISTORY_MESSAGE_LENGTH),
    }));
  const knowledgeBase=(input.knowledgeBase??[])
    .slice(0,MAX_KNOWLEDGE_ITEMS)
    .map((item)=>({
      title:limitText(item.title,500),
      content:limitText(item.content,MAX_KNOWLEDGE_LENGTH),
    }));

  return JSON.stringify({
    task:"Analyze a customer-support request and determine whether an automated reply is safe.",
    rules:[
      "Return JSON only.",
      "Use decision reply only when the request can be answered safely and accurately.",
      "Use human_review when confidence is below the required threshold.",
      "Use human_review when important information is missing.",
      "Use human_review when the knowledge base does not support a reliable answer.",
      "Use human_review when the request requires a human decision or specialist intervention.",
      "Use reject only to indicate that automated handling should not proceed; the application will perform the final deterministic automation decision.",
      "Never invent policies, prices, refunds, account information, order information, or actions that are not supported by the supplied context.",
      "Never use response-time language such as 'shortly', 'soon', 'within X hours', 'within X days', or similar unless an explicit response-time policy is provided in the supplied company policies or Knowledge Base.",
      "Policy violations must be reported in policyIssues.",
    ],
    tone,
    length,
    customerMessage:limitText(input.customerMessage,MAX_MESSAGE_LENGTH),
    conversationHistory:history,
    knowledgeBase,
    customerContext:input.customerContext??{},
    companyPolicies:input.companyPolicies??{},
    outputSchema:{
      decision:"reply | human_review | reject",
      confidence:"number between 0 and 1",
      category:"account | billing | cancellation | complaint | feature_request | refund | shipping | technical | product | general_support",
      sentiment:"positive | neutral | negative | urgent",
      needsHuman:"boolean",
      reason:"string",
      reply:"string",
      suggestedActions:"string[]",
      missingInformation:"string[]",
      policyIssues:"string[]",
    },
  });
}