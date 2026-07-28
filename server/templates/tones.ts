export const TONES = {
  professional: {
    label: "Professional",
    instruction:
      "Use a professional, respectful and business-like tone.",
  },

  friendly: {
    label: "Friendly",
    instruction:
      "Use a warm, conversational and approachable tone.",
  },

  empathetic: {
    label: "Empathetic",
    instruction:
      "Show empathy, understanding and reassurance.",
  },

  concise: {
    label: "Concise",
    instruction:
      "Be brief, direct and easy to read.",
  },

  formal: {
    label: "Formal",
    instruction:
      "Use formal language suitable for business communication.",
  },

  enthusiastic: {
    label: "Enthusiastic",
    instruction:
      "Sound positive and encouraging while remaining professional.",
  },
} as const;

export type Tone = keyof typeof TONES;

export const LENGTHS = {
  short: {
    label: "Short",
    instruction:
      "Keep the reply under 100 words.",
  },

  medium: {
    label: "Medium",
    instruction:
      "Keep the reply between 100 and 200 words.",
  },

  long: {
    label: "Long",
    instruction:
      "Keep the reply between 200 and 350 words.",
  },
} as const;

export type ReplyLength = keyof typeof LENGTHS;

export const DEFAULT_TONE: Tone = "professional";

export const DEFAULT_LENGTH: ReplyLength = "medium";

export const TONE_OPTIONS = Object.keys(
  TONES
) as Tone[];

export const LENGTH_OPTIONS = Object.keys(
  LENGTHS
) as ReplyLength[];
