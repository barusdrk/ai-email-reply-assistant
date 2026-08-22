import {
  Router,
  type Request,
  type Response,
} from "express";

import {
  auth,
} from "../middleware/auth.js";

import {
  getProfile,
  updateProfile,
} from "../services/profile.js";

const router =
  Router();

router.use(auth);

router.get(
  "/",
  async(
    req:Request,
    res:Response
  )=>{
    if(!req.user){
      res.status(401).json({
        message:
          "Unauthorized.",
      });

      return;
    }

    const profile =
      await getProfile(
        req.user.id
      );

    res.json(profile);
  }
);

router.put(
  "/",
  async(
    req:Request,
    res:Response
  )=>{
    if(!req.user){
      res.status(401).json({
        message:
          "Unauthorized.",
      });

      return;
    }

    const profile =
      await updateProfile(
        req.user.id,
        req.body
      );

    res.json(profile);
  }
);

export default router;
