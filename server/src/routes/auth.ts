import { Router } from "express";

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
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
      } = req.body;

      const result =
        await register(
          name,
          email,
          password
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
  async (req, res) => {
    try {
      const {
        email,
        password,
      } = req.body;

      const result =
        await login(
          email,
          password
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
  async (req, res) => {
    try {
      const user =
        await getCurrentUser(
          (req as any).user.id
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
