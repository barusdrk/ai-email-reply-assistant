import type {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import type {
  ZodTypeAny,
  ZodError,
} from "zod";

export function validate(
  schema: ZodTypeAny
): RequestHandler {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      req.body = result.body;
      req.params = result.params;
      req.query = result.query;

      next();
    } catch (error) {
      const zodError = error as ZodError;

      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: zodError.flatten(),
      });
    }
  };
}

export function validateBody(
  schema: ZodTypeAny
): RequestHandler {
  return (
    req,
    res,
    next
  ) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body.",
        errors: (error as ZodError).flatten(),
      });
    }
  };
}

export function validateParams(
  schema: ZodTypeAny
): RequestHandler {
  return (
    req,
    res,
    next
  ) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid route parameters.",
        errors: (error as ZodError).flatten(),
      });
    }
  };
}

export function validateQuery(
  schema: ZodTypeAny
): RequestHandler {
  return (
    req,
    res,
    next
  ) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters.",
        errors: (error as ZodError).flatten(),
      });
    }
  };
}
