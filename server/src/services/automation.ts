import {Types} from "mongoose";
import {draftRepository} from "../repositories/DraftRepository.js";
import {approvalRepository} from "../repositories/ApprovalRepository.js";
import {determineAutomaticAction,type AutomaticAction} from "./automaticActions.js";
import {scoreReplyConfidence} from "./confidenceScoring.js";
import type {ConfidenceScore} from "../ai/types.js";
import {checkReplyPolicy,type PolicyCheckResult} from "./policyChecker.js";
import {determineEscalation} from "./escalation.js";

export interface AutomationInput {
  userId:string;
  draftId:string;
  customerEmail?:string;
  knowledgeBase?:{
    title:string;
    content:string;
    category?:string;
    tags?:string[];
  }[];
}

export interface AutomationResult {
  draftId:string;
  action:AutomaticAction;
  status:"approved"|"pending"|"escalated"|"blocked";
  confidence:ConfidenceScore;
  policy:PolicyCheckResult;
  reasons:string[];
}

function toStatus(action:AutomaticAction):AutomationResult["status"] {
  if(action==="auto_approve") return "approved";
  if(action==="pending") return "pending";
  if(action==="escalate") return "escalated";
  return "blocked";
}

function uniqueReasons(reasons:string[]):string[] {
  return [...new Set(reasons.map((reason)=>reason.trim()).filter(Boolean))].slice(0,10);
}

export async function evaluateDraftAutomation(input:AutomationInput):Promise<AutomationResult|null> {
  if(!Types.ObjectId.isValid(input.userId)) throw new Error("Invalid user ID.");
  if(!Types.ObjectId.isValid(input.draftId)) throw new Error("Invalid draft ID.");

  const draft=await draftRepository.findById(input.draftId);
  if(!draft) return null;

  if(draft.userId.toString()!==input.userId) throw new Error("Unauthorized.");
  if(draft.status==="sent") throw new Error("Sent drafts cannot be evaluated for automatic handling.");

  const customerEmail=(input.customerEmail?.trim()||draft.customer.trim());
  if(!customerEmail) throw new Error("Customer email is required for automatic handling.");

  const confidence=await scoreReplyConfidence({
    email:customerEmail,
    reply:draft.reply,
    knowledgeBase:input.knowledgeBase,
  });

  const policy=await checkReplyPolicy({
    email:customerEmail,
    reply:draft.reply,
    knowledgeBase:input.knowledgeBase,
  });

  const automaticAction=determineAutomaticAction(customerEmail,confidence,policy);
  let action=automaticAction.action;
  let reasons=uniqueReasons(automaticAction.reasons);

  if(action!=="blocked"){
    const escalation=determineEscalation(customerEmail,confidence,policy);
    if(escalation.escalated){
      action="escalate";
      reasons=uniqueReasons([...reasons,...escalation.reasons]);
    }
  }

  const status=toStatus(action);

  const updateData:{
    automaticAction:AutomaticAction;
    automaticActionReasons:string[];
    confidence:{
      score:number;
      level:ConfidenceScore["level"];
      reasons:string[];
    };
    supportPolicyIssues:string[];
    status:"pending"|"approved"|"escalated";
    approvedAt?:Date;
    escalatedAt?:Date;
    escalationReason?:string;
    escalationReasons?:string[];
  }={
    automaticAction:action,
    automaticActionReasons:reasons,
    confidence:{
      score:confidence.score,
      level:confidence.level,
      reasons:confidence.reasons,
    },
    supportPolicyIssues:[...new Set([...policy.violations,...policy.warnings])].slice(0,10),
    status:action==="auto_approve"?"approved":action==="escalate"?"escalated":"pending",
  };

  if(action==="auto_approve"){
    updateData.approvedAt=new Date();
  }else if(action==="escalate"){
    updateData.escalatedAt=new Date();
    updateData.escalationReason=reasons[0]??"Human escalation is required.";
    updateData.escalationReasons=reasons;
  }

  await draftRepository.update(input.draftId,updateData);

  if(action==="pending"||action==="escalate"){
    const existingApproval=await approvalRepository.findPendingByDraft(input.draftId);
    if(!existingApproval){
      await approvalRepository.create({
        draftId:draft._id,
        emailId:draft.emailId,
        requesterId:draft.userId,
        reviewerId:draft.userId,
        status:"pending",
        priority:action==="escalate"?"high":"medium",
      });
    }
  }

  return {
    draftId:input.draftId,
    action,
    status,
    confidence,
    policy,
    reasons,
  };
}
