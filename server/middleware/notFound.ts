import type {
  Request,
  Response,
  NextFunction,
} from "express";

export function notFound(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  res.status(404).json({
    success: false,
    message: "Route not found",
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
}
