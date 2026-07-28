import type {
  Tone,
  ReplyLength,
} from "../templates/tones.js";

export type DraftStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "scheduled"
  | "sent";

export interface DraftRecord {
  id?: string;
  userId: string;
  emailId: string;
  reply: string;
  tone: Tone;
  length: ReplyLength;
  status: DraftStatus;
  approvedBy?: string;
  scheduledFor?: Date;
  sentAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateDraftInput {
  userId: string;
  emailId: string;
  reply: string;
  tone: Tone;
  length: ReplyLength;
}

export interface UpdateDraftInput {
  reply?: string;
  tone?: Tone;
  length?: ReplyLength;
  status?: DraftStatus;
  approvedBy?: string;
  scheduledFor?: Date;
  sentAt?: Date;
}
