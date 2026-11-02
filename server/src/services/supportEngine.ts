import OpenAI from "openai";
import {env} from "../config/env.js";
import {
  buildPrompt,
  normalizeResult,
  DEFAULT_TONE,
  DEFAULT_LENGTH,
  CONFIDENCE_THRESHOLD,
  MAX_MESSAGE_LENGTH,
  type SupportTone,
  type SupportLength,
  type ConversationMessage,
  type KnowledgeBaseItem,
  type CustomerContext,
  type SupportPolicy,
  type SupportEngineInput,
  type SupportEngineResult,
} from "./supportEngineLogic.js";

export type {
  SupportTone,
  SupportLength,
  ConversationMessage,
  KnowledgeBaseItem,
  CustomerContext,
  SupportPolicy,
  SupportEngineInput,
  SupportEngineResult,
};

export {
  buildPrompt,
  normalizeResult,
  DEFAULT_TONE,
  DEFAULT_LENGTH,
  CONFIDENCE_THRESHOLD,
  MAX_MESSAGE_LENGTH,
};

function getOpenAIClient(){
  if(!env.OPENAI_API_KEY)throw new Error("OpenAI API is not configured.");
  return new OpenAI({apiKey:env.OPENAI_API_KEY});
}

export async function analyzeSupportRequest(input:SupportEngineInput):Promise<SupportEngineResult>{
  const customerMessage=typeof input.customerMessage==="string"
    ?input.customerMessage.trim().slice(0,MAX_MESSAGE_LENGTH)
    :"";

  if(!customerMessage)throw new Error("Customer message is required.");

  const client=getOpenAIClient();

  const response=await client.chat.completions.create({
    model:env.OPENAI_MODEL||"gpt-4o-mini",
    response_format:{type:"json_object"},
    messages:[
      {
        role:"system",
        content:"You are a reliable AI customer-support decision engine. Return valid JSON only and follow the support safety rules provided by the application.",
      },
      {
        role:"user",
        content:buildPrompt({...input,customerMessage}),
      },
    ],
  });

  const content=response.choices[0]?.message?.content;

  if(!content)throw new Error("AI customer-support engine returned an empty response.");

  try{
    return normalizeResult(
      JSON.parse(content),
      input.knowledgeBase??[],
      customerMessage,
    );
  }catch{
    const fenced=content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

    if(!fenced?.[1])throw new Error("AI customer-support engine returned invalid JSON.");

    try{
      return normalizeResult(
        JSON.parse(fenced[1]),
        input.knowledgeBase??[],
        customerMessage,
      );
    }catch{
      throw new Error("AI customer-support engine returned invalid JSON.");
    }
  }
}

export async function generateSupportReply(input:SupportEngineInput):Promise<SupportEngineResult>{
  const result=await analyzeSupportRequest(input);

  if(result.reply.trim())return result;

  return {
    ...result,
    decision:result.decision==="reject"?"reject":"human_review",
    needsHuman:true,
    reason:result.reason||"The AI did not generate a usable customer response.",
    reply:"Thanks for reaching out. We've received your support request, and our team will review it.",
  };
}

export async function shouldAutoReply(input:SupportEngineInput):Promise<boolean>{
  const result=await analyzeSupportRequest(input);

  return result.decision==="reply"&&
    result.confidence>=CONFIDENCE_THRESHOLD&&
    !result.needsHuman&&
    result.policyIssues.length===0&&
    Boolean(result.reply);
}
