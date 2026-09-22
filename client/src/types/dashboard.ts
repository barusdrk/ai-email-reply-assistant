export interface DashboardSupportVolume {
  date: string;
  count: number;
}

export interface DashboardSupportCategory {
  category: string;
  count: number;
}

export interface DashboardStats {
  totalConversations: number;
  aiGeneratedReplies: number;
  automaticallyHandled: number;
  humanApprovals: number;
  escalations: number;
  blockedResponses: number;
  averageResponseTimeMinutes: number;
  aiConfidence: number;
  approvalRate: number;
  automationRate: number;
  supportVolume: DashboardSupportVolume[];
  topSupportCategories: DashboardSupportCategory[];
}
