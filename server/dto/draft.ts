import type {
  ReplyLength,
  Tone,
} from "../templates/tones.js";

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
  status?: string;
  approvedBy?: string;
  scheduledFor?: Date;
  sentAt?: Date;
}
