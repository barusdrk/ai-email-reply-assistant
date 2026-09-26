import API from "./api.js";

export type AnalyticsAutomaticAction="auto_approve"|"pending"|"escalate"|"blocked";
export type AnalyticsOutcome="auto_sent"|"pending_approval"|"approved"|"rejected"|"escalated"|"blocked"|"sent"|"failed";
export type AnalyticsConfidenceLevel="high"|"medium"|"low";

export interface SupportAnalyticsSummary{
  total:number;
  autoApproved:number;
  pending:number;
  pendingApproval:number;
  escalated:number;
  blocked:number;
  autoSent:number;
  approved:number;
  rejected:number;
  failed:number;
  averageConfidence:number|null;
  highConfidence:number;
  mediumConfidence:number;
  lowConfidence:number;
  policyViolations:number;
  automationRate:number;
}

export interface SupportAnalyticsCategory{
  category:string;
  count:number;
}

export interface SupportAnalyticsConfidence{
  level:AnalyticsConfidenceLevel;
  count:number;
}

export interface SupportAnalytics{
  summary:SupportAnalyticsSummary;
  categories:SupportAnalyticsCategory[];
  confidence:SupportAnalyticsConfidence[];
  period:{
    from:string|null;
    to:string|null;
  };
}

export interface AnalyticsPeriod{
  from?:string;
  to?:string;
}

export async function getSupportAnalytics(period:AnalyticsPeriod={}):Promise<SupportAnalytics>{
  const params:Record<string,string>={};
  if(period.from)params.from=period.from;
  if(period.to)params.to=period.to;

  const response=await API.get<{
    success:boolean;
    analytics:SupportAnalytics;
  }>("/analytics",{params});

  return response.data.analytics;
}
