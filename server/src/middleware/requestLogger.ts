import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { logger } from "../config/logger.js";

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const started = Date.now();

  res.on("finish", () => {
    logger.info({
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: Date.now() - started,
      userId: req.user?.id,
    });
  });

  next();
}
