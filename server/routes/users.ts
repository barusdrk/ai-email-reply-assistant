import { Router } from "express";
import { auth } from "../middleware/auth.js";
import {
  me,
  updateProfile,
  deleteAccount,
} from "../services/users.js";

const router = Router();

router.use(auth);

router.get("/me", async (req: any, res) => {
  res.json(
    await me(req.user.id)
  );
});

router.put("/me", async (req: any, res) => {
  res.json(
    await updateProfile(
      req.user.id,
      req.body
    )
  );
});

router.delete("/me", async (req: any, res) => {
  await deleteAccount(req.user.id);

  res.status(204).end();
});

export default router;
