import api from "./api.js";

export interface DashboardStats {
  inboxEmails: number;
  draftReplies: number;
  pendingApprovals: number;
  sentToday: number;
}

interface DashboardResponse {
  success: boolean;
  stats: DashboardStats;
}

export async function getDashboardStats() {
  const response =
    await api.get<DashboardResponse>(
      "/dashboard"
    );

  return response.data.stats;
}
