import "dotenv/config";

function required(
  name: string
) {
  const value =
    process.env[name];

  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}`
    );
  }

  return value;
}

export const env = {
  NODE_ENV:
    process.env.NODE_ENV ??
    "development",

  PORT:
    Number(
      process.env.PORT ??
      3001
    ),

  CLIENT_URL:
    required("CLIENT_URL"),

  MONGODB_URI:
    required("MONGODB_URI"),

  REDIS_URL:
    process.env.REDIS_URL,

  JWT_SECRET:
    required("JWT_SECRET"),

  OPENAI_API_KEY:
    process.env.OPENAI_API_KEY,

  OPENAI_MODEL:
    process.env.OPENAI_MODEL ??
    "gpt-5",

  GOOGLE_CLIENT_ID:
    process.env.GOOGLE_CLIENT_ID,

  GOOGLE_CLIENT_SECRET:
    process.env.GOOGLE_CLIENT_SECRET,

  GOOGLE_CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL,

  MICROSOFT_CLIENT_ID:
    process.env.MICROSOFT_CLIENT_ID,

  MICROSOFT_CLIENT_SECRET:
    process.env.MICROSOFT_CLIENT_SECRET,

  MICROSOFT_CALLBACK_URL:
    process.env.MICROSOFT_CALLBACK_URL,

  STRIPE_SECRET_KEY:
    process.env.STRIPE_SECRET_KEY,

  STRIPE_WEBHOOK_SECRET:
    process.env.STRIPE_WEBHOOK_SECRET,

  STRIPE_PRICE_STARTER:
    process.env.STRIPE_PRICE_STARTER,

  STRIPE_PRICE_PRO:
    process.env.STRIPE_PRICE_PRO,

  FREE_DAILY_LIMIT:
    Number(
      process.env.FREE_DAILY_LIMIT ??
      5
    ),

  STARTER_DAILY_LIMIT:
    Number(
      process.env.STARTER_DAILY_LIMIT ??
      100
    ),

  PRO_DAILY_LIMIT:
    Number(
      process.env.PRO_DAILY_LIMIT ??
      1000
    ),
} as const;
