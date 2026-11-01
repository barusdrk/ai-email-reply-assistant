import type {ConfidenceScore} from "../ai/types.js";
import type {PolicyCheckResult} from "./policyChecker.js";
import type {SupportEngineResult} from "./supportEngineLogic.js";
import {determineEscalation} from "./escalation.js";

export type AutomaticAction="auto_approve"|"pending"|"escalate"|"blocked";

export interface AutomaticActionResult{
  action:AutomaticAction;
  reasons:string[];
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

  if(escalation.escalated){
    return {
      action:"escalate",
      reasons:escalation.reasons,
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
