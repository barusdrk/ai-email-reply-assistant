import {
  Router,
  type Request,
  type Response,
} from "express";

import {
  login,
  register,
  getCurrentUser,
} from "../services/auth.js";

import {
  authenticate,
} from "../middleware/auth.js";

const router = Router();

router.post(
  "/register",
  async (
    req: Request<
      {},
      {},
      {
        name?: string;
        email: string;
        password: string;
      }
    >,
    res: Response
  ) => {
    try {
      const result =
        await register(
          req.body.name ?? "User",
          req.body.email,
          req.body.password
        );

      res
        .status(201)
        .json(result);
    } catch (error) {
      res
        .status(400)
        .json({
          message:
            error instanceof Error
              ? error.message
              : "Registration failed.",
        });
    }
  }
);

router.post(
  "/login",
  async (
    req: Request<
      {},
      {},
      {
        email: string;
        password: string;
      }
    >,
    res: Response
  ) => {
    try {
      const result =
        await login(
          req.body.email,
          req.body.password
        );

      res.json(result);
    } catch (error) {
      res
        .status(401)
        .json({
          message:
            error instanceof Error
              ? error.message
              : "Invalid credentials.",
        });
    }
  }
);

router.get(
  "/me",
  authenticate,
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const user =
        await getCurrentUser(
          req.user!.id
        );

      res.json(user);
    } catch {
      res
        .status(404)
        .json({
          message:
            "User not found.",
        });
    }
  }
);

export default router;
