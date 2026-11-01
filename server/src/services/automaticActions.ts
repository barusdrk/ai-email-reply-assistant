import type {ConfidenceScore} from "../ai/types.js";
import type {PolicyCheckResult} from "./policyChecker.js";
import type {SupportEngineResult} from "./supportEngineLogic.js";
import {determineEscalation} from "./escalation.js";

export type AutomaticAction="auto_approve"|"pending"|"escalate"|"blocked";

export interface AutomaticActionResult{
  action:AutomaticAction;
  reasons:string[];
}

function isSafeDocumentedPasswordReset(
  email:string,
  supportResult?:SupportEngineResult,
):boolean{
  if(!supportResult||supportResult.decision!=="reply"||supportResult.needsHuman||supportResult.policyIssues.length>0||!supportResult.reply.trim())return false;
  const message=email.toLowerCase();
  const reply=supportResult.reply.toLowerCase();
  const isPasswordResetRequest=/\\b(?:forgot|reset|resetting)\\b.{0,50}\\bpassword\\b|\\bpassword\\s+reset\\b/.test(message);
  const indicatesFailedAttempt=/\\b(?:already\\s+)?(?:tried|attempted|requested)\\b.{0,60}\\b(?:reset|password)\\b|\\b(?:reset|password)\\s+(?:email|link)\\b.{0,50}\\b(?:not\\s+(?:received|arrived)|never\\s+(?:received|arrived)|missing)\\b|\\b(?:locked\\s+out|unauthorized|unauthorised|hacked|compromised|someone\\s+accessed)\\b/.test(message);
  const confirmsDocumentedInstructions=/\\bdocumented\\s+password[- ]reset\\s+instructions\\b/.test(reply);
  return isPasswordResetRequest&&!indicatesFailedAttempt&&confirmsDocumentedInstructions;
}

export function determineAutomaticAction(
  email:string,
  confidence:ConfidenceScore,
  policy:PolicyCheckResult,
  supportResult?:SupportEngineResult,
  autoSendEnabled=false,
):AutomaticActionResult{
  if(!policy.compliant||policy.violations.length>0){
    return {
      action:"blocked",
      reasons:policy.violations.length>0
        ?policy.violations
        :["Policy check failed."],
    };
  }

  if(supportResult?.decision==="reject"){
    return {
      action:"blocked",
      reasons:[
        supportResult.reason||"The support engine rejected the response.",
        ...supportResult.policyIssues,
      ].filter(Boolean),
    };
  }

  if(supportResult?.policyIssues.length){
    return {
      action:"escalate",
      reasons:supportResult.policyIssues,
    };
  }

  if(supportResult?.needsHuman||supportResult?.decision==="human_review"){
    const reasons=[
      supportResult.reason||"The support engine determined that human review is required.",
      ...supportResult.policyIssues,
    ].filter(Boolean);

    return {
      action:"escalate",
      reasons:reasons.length>0
        ?reasons
        :["Human review is required before this response can be sent."],
    };
  }

  const escalation=determineEscalation(
    email,
    confidence,
    policy,
  );
  const safeDocumentedPasswordReset=isSafeDocumentedPasswordReset(email,supportResult);
  const escalationReasons=safeDocumentedPasswordReset
    ?escalation.reasons.filter((reason)=>reason!=="Account access issue detected.")
    :escalation.reasons;

  if(escalationReasons.length>0){
    return {
      action:"escalate",
      reasons:escalationReasons,
    };
  }

  if(confidence.level==="low"){
    return {
      action:"escalate",
      reasons:[
        `Low AI confidence: ${confidence.score}/100.`,
        "Automatic handling is not permitted for low-confidence requests.",
        "Human specialist escalation is required.",
      ],
    };
  }

  if(confidence.level==="medium"){
    return {
      action:"pending",
      reasons:[
        `Medium AI confidence: ${confidence.score}/100.`,
        "Human approval is required before the response can be sent.",
      ],
    };
  }

if(confidence.level==="high"){
  if(autoSendEnabled&&supportResult?.decision==="reply"&&!supportResult.needsHuman&&supportResult.reply.trim()&&supportResult.policyIssues.length===0){
    return {action:"auto_approve",reasons:[`High AI confidence: ${confidence.score}/100.`,"Support checks passed and automatic sending is enabled."]};
  }
  return {action:"pending",reasons:[`High AI confidence: ${confidence.score}/100.`,"Human approval is required before the response can be sent.",...(autoSendEnabled?["The support result is not eligible for automatic sending."]:["Automatic sending is disabled."])]};
}

  return {
    action:"pending",
    reasons:[
      `Unknown AI confidence level: ${confidence.level}.`,
      "Human approval is required.",
    ],
  };
}
