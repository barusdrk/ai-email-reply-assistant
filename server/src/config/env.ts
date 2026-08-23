import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function optional(name: string): string | undefined {
  return process.env[name];
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3001),
  CLIENT_URL: process.env.CLIENT_URL ?? "http://localhost:5173",
  MONGODB_URI: required("MONGODB_URI"),
  REDIS_URL: optional("REDIS_URL"),
  JWT_SECRET: required("JWT_SECRET"),

  USE_MOCK_AI: process.env.USE_MOCK_AI === "true",

  OPENAI_API_KEY: optional("OPENAI_API_KEY"),
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-5",

  GEMINI_API_KEY: optional("GEMINI_API_KEY"),
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",

  GROQ_API_KEY: optional("GROQ_API_KEY"),
  GROQ_MODEL: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",

  ANTHROPIC_API_KEY: optional("ANTHROPIC_API_KEY"),
  CLAUDE_MODEL: process.env.CLAUDE_MODEL ?? "claude-sonnet-4-20250514",

  GOOGLE_CLIENT_ID: required("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: required("GOOGLE_CLIENT_SECRET"),
  GOOGLE_CALLBACK_URL: required("GOOGLE_CALLBACK_URL"),

  MICROSOFT_CLIENT_ID: required("MICROSOFT_CLIENT_ID"),
  MICROSOFT_CLIENT_SECRET: required("MICROSOFT_CLIENT_SECRET"),
  MICROSOFT_CALLBACK_URL: required("MICROSOFT_CALLBACK_URL"),
  MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID ?? "common",

  STRIPE_SECRET_KEY: optional("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: optional("STRIPE_WEBHOOK_SECRET"),
  STRIPE_PRICE_STARTER: optional("STRIPE_PRICE_STARTER"),
  STRIPE_PRICE_PRO: optional("STRIPE_PRICE_PRO"),

  FREE_DAILY_LIMIT: Number(process.env.FREE_DAILY_LIMIT ?? 5),
  STARTER_DAILY_LIMIT: Number(process.env.STARTER_DAILY_LIMIT ?? 100),
  PRO_DAILY_LIMIT: Number(process.env.PRO_DAILY_LIMIT ?? 1000),
} as const;
