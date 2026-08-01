import { Request, Response, NextFunction } from "express";

export function authorize(...roles: string[]) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const user = (req as any).user;

    if (!user)
      return res.sendStatus(401);

    if (!roles.includes(user.role))
      return res.sendStatus(403);

    next();
  };
}
