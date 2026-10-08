import {draftRepository} from "../repositories/DraftRepository.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {determineAutomaticAction} from "./automaticActions.js";
import {analyzeDraftSupport,applySupportDecision,evaluateDraftPolicy,scoreDraftConfidence} from "./draftSupport.js";
import {isValidObjectId} from "./draftValidation.js";
import {SUPPORT_CATEGORIES,type SupportCategory} from "../models/Draft.js";
import type {CreateDraftData} from "./draftTypes.js";
import {sendAutomatically} from "./automaticSend.js";
import {requestApproval} from "./draftApproval.js";

function normalizeSupportCategory(
  value:string,
):SupportCategory{
  return (SUPPORT_CATEGORIES as readonly string[]).includes(value)
    ?value as SupportCategory
    :"general_support";
}

async function markCreatedDraft(
  emailId:string,
  draftId:any,
){
  await emailRepository.markAutomaticDraftGenerated(
    emailId,
    draftId,
  );
}

export async function createDraft(data:CreateDraftData){
  if(!isValidObjectId(data.userId)){
    throw new Error("Invalid user ID.");
  }

  if(!isValidObjectId(data.emailId)){
    throw new Error("Invalid source email ID.");
  }

  const tone=data.tone??"professional";
  const length=data.length??"medium";

  const support=await analyzeDraftSupport(
    data.userId,
    data.emailId,
    data.customer,
    tone,
    length,
  );

  const supportResult=support.supportResult;

  // The centralized support engine is the authoritative source for automatic replies.
  const reply=supportResult.reply.trim();

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

    /**
     * If another sync/process already created the draft, do not
     * request another approval or perform another side effect.
     */
    await markCreatedDraft(
      data.emailId,
      createdDraft._id,
    );

    if(!draftResult.created){
      return createdDraft;
    }

    await requestApproval(
      createdDraft._id.toString(),
      data.userId,
    );

    return createdDraft;
  }

  const confidence=await scoreDraftConfidence(
    data.userId,
    support.customerEmailBody,
    reply,
    support.knowledgeBase,
    supportResult.needsHuman
      ?"human_review"
      :"automated_reply",
  );

  const policy=await evaluateDraftPolicy(
    data.userId,
    support.customerEmailBody,
    reply,
    support.knowledgeBase,
  );

  const automaticAction=applySupportDecision(
    determineAutomaticAction(
      support.customerEmailBody,
      confidence,
      policy,
    ),
    supportResult,
  );

  const status=automaticAction.action==="escalate"
    ?"escalated"
    :automaticAction.action==="auto_approve"
      ?"approved"
      :automaticAction.action==="blocked"
        ?"rejected"
        :"pending";

  const now=new Date();

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
    supportDecision:supportResult.decision,
    supportNeedsHuman:supportResult.needsHuman,
    supportReason:supportResult.reason,
    supportSuggestedActions:supportResult.suggestedActions,
    supportMissingInformation:supportResult.missingInformation,
    supportPolicyIssues:supportResult.policyIssues,
    escalatedAt:status==="escalated"
      ?now
      :undefined,
    escalationReason:status==="escalated"
      ?automaticAction.reasons[0]
      :undefined,
    escalationReasons:status==="escalated"
      ?automaticAction.reasons
      :[],
    approvedAt:status==="approved"
      ?now
      :undefined,
    rejectionReason:status==="rejected"
      ?automaticAction.reasons.join(" ")
      :undefined,
  });

  const createdDraft=draftResult.draft;

  /**
   * Mark the source email as permanently processed for automatic
   * draft generation. Deleting this draft later must not make the
   * source email eligible for automatic regeneration.
   */
  await markCreatedDraft(
    data.emailId,
    createdDraft._id,
  );

  /**
   * Another worker already created this draft.
   *
   * Returning here is critical: the losing worker must not send the
   * same reply or create a second approval request.
   */
  if(!draftResult.created){
    return createdDraft;
  }

  if (automaticAction.action === "auto_approve") {
    console.log("AUTOMATIC APPROVAL: sending draft:", {
      draftId: createdDraft._id.toString(),
      userId: data.userId,
    });
    try {
      await sendAutomatically(
        data.userId,
        createdDraft._id.toString(),
      );
    } catch (error) {
      console.error(
        "Automatic support reply failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }else if(
    automaticAction.action==="pending"||
    automaticAction.action==="escalate"
  ){
    await requestApproval(
      createdDraft._id.toString(),
      data.userId,
    );
  }

  return createdDraft;
}
