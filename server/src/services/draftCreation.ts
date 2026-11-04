import {draftRepository} from "../repositories/DraftRepository.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {determineAutomaticAction} from "./automaticActions.js";
import {analyzeDraftSupport,applySupportDecision,evaluateDraftPolicy,scoreDraftConfidence} from "./draftSupport.js";
import {isValidObjectId} from "./draftValidation.js";
import {SUPPORT_CATEGORIES,type SupportCategory} from "../models/Draft.js";
import type {CreateDraftData} from "./draftTypes.js";
import {requestApproval} from "./draftApproval.js";
import {getSettings} from "./settings.js";
import type {Draft} from "../models/Draft.js";

function normalizeSupportCategory(
  value:string,
):SupportCategory{
  return (SUPPORT_CATEGORIES as readonly string[]).includes(value)
    ?value as SupportCategory
    :"general_support";
}

async function markCreatedDraft(emailId:string,draftId:any,claimToken?:string){
  const updated=await emailRepository.markAutomaticDraftGenerated(
    emailId,
    draftId,
    claimToken,
  );
  if(claimToken&&!updated){
    throw new Error("Automatic draft-generation claim was lost before completion.");
  }
}

export async function createDraft(data:CreateDraftData, options:{returnCreationResult?:boolean}={}){
  if(!isValidObjectId(data.userId)){
    throw new Error("Invalid user ID.");
  }

  if(!isValidObjectId(data.emailId)){
    throw new Error("Invalid source email ID.");
  }

  const tone=data.tone??"professional";
  const length=data.length??"medium";
  const settings=await getSettings(data.userId);
  const autoSendEnabled=settings.autoSendEnabled===true;

  const support=await analyzeDraftSupport(
    data.userId,
    data.emailId,
    data.customer,
    tone,
    length,
  );

  const supportResult=support.supportResult;
  let supportResultForDecision=supportResult;

  let reply=supportResult.reply.trim();

  if(!reply){
    const draftResult=await draftRepository.createIfNotExists({
      userId:data.userId as any,
      emailId:data.emailId as any,
      provider:data.provider,
      subject:data.subject,
      customer:data.customer.trim(),
      reply:"",
      tone,
      length,
      status:"pending",
      confidence:{
        score:Math.round(supportResult.confidence*100),
        level:supportResult.confidence>=0.75
          ?"high"
          :supportResult.confidence>=0.5
            ?"medium"
            :"low",
        reasons:[
          "The AI customer-support engine did not generate a customer-ready reply.",
          supportResult.reason,
        ].filter(Boolean),
      },
      automaticAction:"pending",
      automaticActionReasons:[
        "The AI customer-support engine did not generate a customer-ready reply.",
      ],
      supportCategory:normalizeSupportCategory(
        supportResult.category,
      ),
      supportSentiment:supportResult.sentiment,
      supportConfidence:supportResult.confidence,
      supportDecision:"human_review",
      supportNeedsHuman:true,
      supportReason:"The AI customer-support engine did not generate a customer-ready reply.",
      supportSuggestedActions:supportResult.suggestedActions,
      supportMissingInformation:supportResult.missingInformation,
      supportPolicyIssues:supportResult.policyIssues,
      escalatedAt:undefined,
      escalationReason:undefined,
      escalationReasons:[],
      approvedAt:undefined,
      rejectionReason:undefined,
    });

    const createdDraft=draftResult.draft;

    await markCreatedDraft(
      data.emailId,
      createdDraft._id,
      data.automaticDraftGenerationClaimToken,
    );

    if(!draftResult.created){
      return options.returnCreationResult?{draft:createdDraft,created:false}:createdDraft;
    }

    await requestApproval(
      createdDraft._id.toString(),
      data.userId,
    );

    return options.returnCreationResult?{draft:createdDraft,created:true}:createdDraft;
  }

  let confidence=await scoreDraftConfidence(
    data.userId,
    support.customerEmailBody,
    reply,
    support.knowledgeBase,
    supportResult.needsHuman
      ?"human_review"
      :"automated_reply",
  );

  let policy=await evaluateDraftPolicy(
    data.userId,
    support.customerEmailBody,
    reply,
    support.knowledgeBase,
  );
  let replacedPolicyUnsafeReplyReasons:string[]=[];

  if(!policy.compliant||policy.violations.length>0){
    const originalViolations=policy.violations.length>0
      ?policy.violations
      :["The generated reply did not pass policy validation."];
    const safeReviewReply="Thank you for contacting us. We've received your message.";
    const safeReviewPolicy=await evaluateDraftPolicy(
      data.userId,
      support.customerEmailBody,
      safeReviewReply,
      support.knowledgeBase,
    );

    if(safeReviewPolicy.compliant&&safeReviewPolicy.violations.length===0){
      reply=safeReviewReply;
      confidence=await scoreDraftConfidence(
        data.userId,
        support.customerEmailBody,
        reply,
        support.knowledgeBase,
        "human_review",
      );
      policy=safeReviewPolicy;
      supportResultForDecision={
        ...supportResult,
        decision:"human_review",
        needsHuman:true,
        reason:"The generated reply contained unsupported or policy-inconsistent claims. A safe acknowledgement was prepared for human review.",
        reply,
        policyIssues:[],
      };
      replacedPolicyUnsafeReplyReasons=originalViolations.map(
        (reason)=>`Original generated reply was replaced after policy validation: ${reason}`,
      );
    }else{
      reply="";
      supportResultForDecision={
        ...supportResult,
        decision:"human_review",
        needsHuman:true,
        reason:"The generated reply failed policy checks, and a safe replacement could not be verified.",
        reply:"",
      };
    }
  }

  const evaluatedAction=applySupportDecision(
    determineAutomaticAction(
      support.customerEmailBody,
      confidence,
      policy,
      supportResultForDecision,
      autoSendEnabled,
    ),
    supportResultForDecision,
  );
  const automaticAction={
    ...evaluatedAction,
    reasons:[...evaluatedAction.reasons,...replacedPolicyUnsafeReplyReasons],
  };
  const status=automaticAction.action==="auto_approve"
    ?"approved" as const
    :automaticAction.action==="escalate"
      ?"escalated" as const
      :automaticAction.action==="blocked"
        ?"rejected" as const
        :"pending" as const;

  const draftResult=await draftRepository.createIfNotExists({
    userId:data.userId as any,
    emailId:data.emailId as any,
    provider:data.provider,
    subject:data.subject,
    customer:data.customer.trim(),
    reply,
    tone,
    length,
    status,
    confidence,
    automaticAction:automaticAction.action,
    automaticActionReasons:automaticAction.reasons,
    supportCategory:normalizeSupportCategory(
      supportResult.category,
    ),
    supportSentiment:supportResult.sentiment,
    supportConfidence:supportResult.confidence,
    supportDecision:supportResultForDecision.decision,
    supportNeedsHuman:supportResultForDecision.needsHuman||supportResultForDecision.decision!=="reply"||supportResultForDecision.policyIssues.length>0,
    supportReason:supportResultForDecision.reason,
    supportSuggestedActions:supportResultForDecision.suggestedActions,
    supportMissingInformation:supportResultForDecision.missingInformation,
    supportPolicyIssues:supportResultForDecision.policyIssues,
    escalatedAt:status==="escalated"?new Date():undefined,
    escalationReason:status==="escalated"?automaticAction.reasons[0]:undefined,
    escalationReasons:status==="escalated"?automaticAction.reasons:[],
    approvedAt:status==="approved"?new Date():undefined,
    rejectionReason:status==="rejected"?automaticAction.reasons.join(" "):undefined,
  });

  const createdDraft=draftResult.draft;

  await markCreatedDraft(
    data.emailId,
    createdDraft._id,
    data.automaticDraftGenerationClaimToken,
  );

  if(draftResult.created&&(automaticAction.action==="pending"||automaticAction.action==="escalate")){
    await requestApproval(
      createdDraft._id.toString(),
      data.userId,
    );
  }

  return options.returnCreationResult
    ?{draft:createdDraft,created:draftResult.created}
    :createdDraft;
}
