export const TONES = {
  professional: {
    instruction:
      "Use a professional and clear tone.",
  },
  friendly: {
    instruction:
      "Use a warm and friendly tone.",
  },
  formal: {
    instruction:
      "Use a formal business tone.",
  },
  empathetic: {
    instruction:
      "Use an understanding and empathetic tone.",
  },
} as const;

export type Tone =
  keyof typeof TONES;

export const LENGTHS = {
  short: {
    instruction:
      "Keep the reply concise.",
  },
  medium: {
    instruction:
      "Write a balanced length reply.",
  },
  long: {
    instruction:
      "Write a detailed reply.",
  },
} as const;

export type Length =
  keyof typeof LENGTHS;

export type ReplyLength =
  Length;

export const DEFAULT_TONE: Tone =
  "professional";

export const DEFAULT_LENGTH: Length =
  "medium";
  