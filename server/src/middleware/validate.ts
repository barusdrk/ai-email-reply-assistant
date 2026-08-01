import type {
  Request,
  Response,
  NextFunction,
} from "express";

import type { ZodSchema } from "zod";

export function validate(
  schema: ZodSchema
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const result =
      schema.safeParse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

    if (!result.success) {
      return res
        .status(400)
        .json({
          message: "Validation failed.",
          errors:
            result.error.errors,
        });
    }

    req.body =
      result.data.body ??
      req.body;

    req.params =
      result.data.params ??
      req.params;

    req.query =
      result.data.query ??
      req.query;

    next();
  };
}

export function validateBody(
  schema: ZodSchema
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const result =
      schema.safeParse(
        req.body
      );

    if (!result.success) {
      return res
        .status(400)
        .json({
          message:
            "Invalid request body.",
          errors:
            result.error.errors,
        });
    }

    req.body =
      result.data;

    next();
  };
}

export function validateParams(
  schema: ZodSchema
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const result =
      schema.safeParse(
        req.params
      );

    if (!result.success) {
      return res
        .status(400)
        .json({
          message:
            "Invalid parameters.",
          errors:
            result.error.errors,
        });
    }

    req.params =
      result.data;

    next();
  };
}

export function validateQuery(
  schema: ZodSchema
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const result =
      schema.safeParse(
        req.query
      );

    if (!result.success) {
      return res
        .status(400)
        .json({
          message:
            "Invalid query.",
          errors:
            result.error.errors,
        });
    }

    req.query =
      result.data;

    next();
  };
}
