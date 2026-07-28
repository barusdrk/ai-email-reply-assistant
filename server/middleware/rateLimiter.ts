import rateLimit from "express-rate-limit";

function createLimiter(
  windowMs: number,
  limit: number,
  message: string
) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    message: {
      success: false,
      message,
    },
  });
}

export const authLimiter =
  createLimiter(
    15 * 60 * 1000,
    20,
    "Too many authentication attempts."
  );

export const aiLimiter =
  createLimiter(
    60 * 1000,
    30,
    "Too many AI requests."
  );

export const apiLimiter =
  createLimiter(
    15 * 60 * 1000,
    300,
    "Too many API requests."
  );

export const webhookLimiter =
  createLimiter(
    60 * 1000,
    120,
    "Webhook rate limit exceeded."
  );

export const oauthLimiter =
  createLimiter(
    5 * 60 * 1000,
    50,
    "Too many OAuth requests."
  );
