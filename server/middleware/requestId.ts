import crypto from "node:crypto";
import type {
  Request,
  Response,
  NextFunction,
} from "express";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestId(
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.requestId =
    crypto.randomUUID();

  res.setHeader(
    "X-Request-Id",
    req.requestId
  );

  next();
}
