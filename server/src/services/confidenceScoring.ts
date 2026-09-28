import OpenAI from "openai";
import {env} from "../config/env.js";

export type ConfidenceLevel="high"|"medium"|"low";
export type ConfidencePurpose="automated_reply"|"human_review";

export interface ConfidenceScore{
  score:number;
  level:ConfidenceLevel;
  reasons:string[];
}

interface ConfidenceInput{
  email:string;
  reply:string;
  purpose?:ConfidencePurpose;
  knowledgeBase?:{
    title:string;
    content:string;
    category?:string;
    tags?:string[];
  }[];
}

function getClient(){
  if(!env.OPENAI_API_KEY){
    throw new Error("OpenAI is not configured.");
  }
  return new OpenAI({apiKey:env.OPENAI_API_KEY});
}

function getConfidenceLevel(score:number):ConfidenceLevel{
  if(score>=75)return "high";
  if(score>=50)return "medium";
  return "low";
}

function extractJson(text:string):ConfidenceScore{
  const cleaned=text.trim()
    .replace(/^```json\s*/i,"")
    .replace(/^```\s*/i,"")
    .replace(/\s*```$/i,"");
  const parsed=JSON.parse(cleaned);
  const score=Math.max(0,Math.min(100,Number(parsed.score)||0));
  return {
    score,
    level:getConfidenceLevel(score),
    reasons:Array.isArray(parsed.reasons)
      ?parsed.reasons.map(String).filter(Boolean).slice(0,5)
      :[],
  };
}

export async function scoreReplyConfidence(input:ConfidenceInput):Promise<ConfidenceScore>{
  const email=input.email.trim();
  const reply=input.reply.trim();
  const purpose=input.purpose??"automated_reply";

  if(!email)throw new Error("Customer email is required for confidence scoring.");
  if(!reply)throw new Error("Reply is required for confidence scoring.");

  const knowledgeBase=(input.knowledgeBase??[])
    .map((article)=>[
      `Title: ${article.title}`,
      `Category: ${article.category??"general"}`,
      `Tags: ${(article.tags??[]).join(", ")}`,
      `Content: ${article.content}`,
    ].join("\n"))
    .join("\n\n");

  const purposeInstructions=purpose==="human_review"
    ?`This draft is intended for HUMAN REVIEW, not automatic sending.

Evaluate whether the proposed reply is a safe, grounded and appropriate interim response while a human support specialist reviews the customer's request.

For a human-review response:
- Do NOT penalize the reply merely because it does not fully resolve the customer's request.
- Do NOT require the reply to provide every supported detail from the Knowledge Base.
- A concise acknowledgement that confirms receipt and says the support team will review the request can be a high-confidence response when the request is sensitive or requires authorization.
- Do NOT require the AI to make a refund, billing, cancellation, security or other sensitive decision that should be made by a human.
- Reward avoiding unsupported promises, unsupported requirements, unsupported timelines and unsupported outcomes.
- Judge whether the reply is safe and appropriate for the human-review workflow, not whether it completely resolves the customer's issue.`
    :`This draft is intended for AUTOMATED SENDING.

Evaluate whether the proposed reply can reliably answer the customer's request without human intervention.

For an automated reply:
- Consider whether the customer's request is sufficiently addressed.
- Consider whether important supported information is missing.
- Require important claims to be grounded in the Knowledge Base.
- Reduce confidence when the reply avoids a necessary answer without a valid human-review reason.
- Reduce confidence when the customer request is ambiguous or requires information that is unavailable.`;

  const prompt=`You are a confidence scorer for an AI customer-support automation platform.

${purposeInstructions}

Always consider:
- Whether the customer's request is correctly understood.
- Whether the reply is supported by the provided Knowledge Base.
- Whether the reply contains unsupported assumptions or claims.
- Whether the reply is appropriate for the selected workflow.
- Whether the reply avoids unsupported timing, follow-up promises and outcomes.
- Whether ambiguity should reduce confidence.

Important:
- Confidence measures how reliable and well-supported the proposed response is for its intended workflow.
- Confidence is NOT the same as policy compliance.
- Do not invent information.
- Do not penalize normal politeness or writing style.
- Use a score from 0 to 100.
- 75–100 = high confidence.
- 50–74 = medium confidence.
- 0–49 = low confidence.

Return ONLY valid JSON with this exact structure:
{
  "score": 92,
  "reasons": [
    "The customer's request is clearly understood.",
    "The response is appropriate for the human-review workflow."
  ]
}

Customer email:
${email}

Proposed reply:
${reply}

Knowledge Base:
${knowledgeBase||"No relevant Knowledge Base information was found."}`;

  const response=await getClient().chat.completions.create({
    model:env.OPENAI_MODEL??"gpt-5.6",
    messages:[
      {
        role:"system",
        content:"You are a precise customer-support confidence scorer. Return only valid JSON.",
      },
      {
        role:"user",
        content:prompt,
      },
    ],
  });

  const content=response.choices[0]?.message?.content;

  if(!content)throw new Error("Confidence scorer returned an empty response.");

  try{
    return extractJson(content);
  }catch{
    throw new Error("Confidence scorer returned invalid JSON.");
  }
}
