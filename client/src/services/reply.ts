import API from "./api.js";
import type { Tone } from "../types/tone.js";
import type { ReplyLength } from "../components/LengthSelector.js";

export interface GenerateReplyInput {
  email: string;
  tone: Tone;
  length: ReplyLength;
  signature?: string;
}

export interface GenerateReplyResponse {
  reply: string;
}

export async function generateReply(
  input: GenerateReplyInput
): Promise<string> {
  try {
    const { data } = await API.post<GenerateReplyResponse>(
      "/reply",
      input
    );

    if (!data?.reply) {
      throw new Error(
        "The server returned an empty reply."
      );
    }

    return data.reply;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ??
      error?.response?.data?.error ??
      error?.message ??
      "Failed to generate reply.";

    throw new Error(message);
  }
}
