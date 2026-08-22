import {
  Router,
  type Request,
  type Response,
} from "express";
import {
  auth,
} from "../middleware/auth.js";
import {
  me,
  updateProfile,
  changePassword,
  deleteAccount,
} from "../services/users.js";

const router = Router();

router.use(auth);

router.get("/me", async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    res.status(401).json({
      message: "Unauthorized.",
    });
    return;
  }

  try {
    res.json(
      await me(req.user.id)
    );
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error
        ? error.message
        : "Failed to load user.",
    });
  }
});

router.put("/me", async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    res.status(401).json({
      message: "Unauthorized.",
    });
    return;
  }

  try {
    res.json(
      await updateProfile(
        req.user.id,
        req.body
      )
    );
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error
        ? error.message
        : "Failed to update profile.",
    });
  }
});

router.put("/me/password", async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    res.status(401).json({
      message: "Unauthorized.",
    });
    return;
  }

  try {
    const {
      currentPassword,
      newPassword,
    } = req.body;

    const result = await changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error
        ? error.message
        : "Failed to change password.",
    });
  }
});

router.delete("/me", async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    res.status(401).json({
      message: "Unauthorized.",
    });
    return;
  }

  try {
    await deleteAccount(req.user.id);
    res.status(204).end();
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error
        ? error.message
        : "Failed to delete account.",
    });
  }
});

export default router;
