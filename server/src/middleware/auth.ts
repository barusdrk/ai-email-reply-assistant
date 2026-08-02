import type {
  Request,
  Response,
  NextFunction,
} from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import type { JwtPayload } from "../types/user.js";

export function auth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const token = header.slice(7);

    const payload = jwt.verify(
      token,
      env.JWT_SECRET
    ) as JwtPayload;

    req.user = payload;

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

export function authorize(
  ...roles: JwtPayload["role"][]
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Permission denied",
      });
    }

    next();
  };
}

export const authenticate = auth;
