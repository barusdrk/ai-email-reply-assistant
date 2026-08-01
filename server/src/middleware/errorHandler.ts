import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { logger } from "../config/logger.js";
import { env } from "../config/env.js";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error({
    message: err.message,
    stack: err.stack,
  });

  const status =
    (err as Error & { status?: number }).status ??
    500;

  res.status(status).json({
    success: false,
    message:
      status === 500
        ? "Internal server error"
        : err.message,
    ...(env.NODE_ENV !== "production"
      ? {
          stack: err.stack,
        }
      : {}),
  });
}
