import type { Draft } from "./draft";

export interface Approval {
  id: string;

  draft: Draft;

  reviewer: string;

  requestedAt: string;

  reviewedAt?: string;

  status:
    | "pending"
    | "approved"
    | "rejected";

  comment?: string;
}
