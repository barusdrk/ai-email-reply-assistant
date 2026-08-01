import { Router } from "express";

import { auth } from "../middleware/auth.js";

import {
  approvals,
  approval,
  requestApproval,
  approve,
  reject,
} from "../services/approval.js";

const router=Router();

router.use(auth);

router.get(
  "/",
  async(req,res,next)=>{
    try{

      const list=
        await approvals(
          req.user!.id
        );

      res.json(list);

    }catch(error){
      next(error);
    }
  }
);

router.get(
  "/:id",
  async(req,res,next)=>{
    try{

      const item=
        await approval(
          req.params.id
        );

      if(!item){
        return res.status(404).json({
          message:"Approval not found",
        });
      }

      res.json(item);

    }catch(error){
      next(error);
    }
  }
);

router.post(
  "/",
  async(req,res,next)=>{
    try{

      const item=
        await requestApproval(
          req.body.draftId,
          req.body.reviewerId
        );

      res
        .status(201)
        .json(item);

    }catch(error){
      next(error);
    }
  }
);

router.patch(
  "/:id/approve",
  async(req,res,next)=>{
    try{

      const item=
        await approve(
          req.params.id
        );

      if(!item){
        return res.status(404).json({
          message:"Approval not found",
        });
      }

      res.json(item);

    }catch(error){
      next(error);
    }
  }
);

router.patch(
  "/:id/reject",
  async(req,res,next)=>{
    try{

      const item=
        await reject(
          req.params.id,
          req.body.comment
        );

      if(!item){
        return res.status(404).json({
          message:"Approval not found",
        });
      }

      res.json(item);

    }catch(error){
      next(error);
    }
  }
);

export default router;
