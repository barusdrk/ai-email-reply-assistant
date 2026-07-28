import "dotenv/config";

function required(name:string){
  const value=process.env[name];
  if(!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const env={
  NODE_ENV:process.env.NODE_ENV ?? "development",
  PORT:Number(process.env.PORT ?? 3001),

  CLIENT_URL:required("CLIENT_URL"),

  MONGODB_URI:required("MONGODB_URI"),

  REDIS_URL:required("REDIS_URL"),

  JWT_SECRET:required("JWT_SECRET"),

  OPENAI_API_KEY:required("OPENAI_API_KEY"),

  OPENAI_MODEL:
    process.env.OPENAI_MODEL ??
    "gpt-5",

  GOOGLE_CLIENT_ID:
    required("GOOGLE_CLIENT_ID"),

  GOOGLE_CLIENT_SECRET:
    required("GOOGLE_CLIENT_SECRET"),

  GOOGLE_CALLBACK_URL:
    required("GOOGLE_CALLBACK_URL"),

  MICROSOFT_CLIENT_ID:
    required("MICROSOFT_CLIENT_ID"),

  MICROSOFT_CLIENT_SECRET:
    required("MICROSOFT_CLIENT_SECRET"),

  MICROSOFT_CALLBACK_URL:
    required("MICROSOFT_CALLBACK_URL"),
} as const;
