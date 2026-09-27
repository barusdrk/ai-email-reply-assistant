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

    try{
      const profile =
        await getProfile(
          req.user.id
        );

      res.json(profile);
    }catch(error){
      res.status(400).json({
        message:error instanceof Error?error.message:"Failed to load profile.",
      });
    }
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

    try{
      const profile =
        await updateProfile(
          req.user.id,
          req.body
        );

      res.json(profile);
    }catch(error){
      res.status(400).json({
        message:error instanceof Error?error.message:"Failed to update profile.",
      });
    }
  }
);

export default router;
