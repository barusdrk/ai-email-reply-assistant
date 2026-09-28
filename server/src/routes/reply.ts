import {Router,type Request,type Response} from "express";
import {authenticate} from "../middleware/auth.js";
import {reserveReplyAllowance,finalizeReplyAllowance,releaseReplyAllowance} from "../services/billing.js";
import {analyzeDraftSupport} from "../services/draftSupport.js";
import {TONES} from "../templates/tones.js";
import type {Tone,ReplyLength} from "../ai/types.js";

const router=Router();

router.post("/",authenticate,async(req:Request,res:Response)=>{
  let reservationId:string|null=null;
  let aiSucceeded=false;
  try{
    if(!req.user){
      res.status(401).json({message:"Unauthorized."});
      return;
    }

    const {email,emailId,tone="professional",length="medium"}=req.body;

    if(typeof email!=="string"||!email.trim()){
      res.status(400).json({message:"Email is required."});
      return;
    }

    if(typeof emailId!=="string"||!emailId.trim()){
      res.status(400).json({message:"Email ID is required."});
      return;
    }

    if(!Object.keys(TONES).includes(tone)){
      res.status(400).json({message:"Invalid tone."});
      return;
    }

    if(!["short","medium","long"].includes(length)){
      res.status(400).json({message:"Invalid reply length."});
      return;
    }

    reservationId=await reserveReplyAllowance(req.user.id);

    if(!reservationId){
      res.status(403).json({
        message:"AI reply limit reached or subscription inactive.",
      });
      return;
    }

    const result=await analyzeDraftSupport(
      req.user.id,
      emailId,
      undefined,
      tone as Parameters<typeof analyzeDraftSupport>[3],
      length as Parameters<typeof analyzeDraftSupport>[4],
    );

    const reply=result.supportResult.reply.trim();

    aiSucceeded=true;

    if(!reply){
      await releaseReplyAllowance(req.user.id,reservationId);
      reservationId=null;
      res.status(500).json({
        message:"AI customer-support engine returned an empty reply.",
      });
      return;
    }

    const finalized=await finalizeReplyAllowance(req.user.id,reservationId);

    if(!finalized){
      console.error("Failed to finalize AI reply usage reservation:",reservationId);
      res.status(500).json({
        message:"Reply generated successfully, but usage tracking could not be finalized.",
      });
      return;
    }

    reservationId=null;

    res.json({
      success:true,
      reply,
      confidence:{
        score:Math.round(result.supportResult.confidence*100),
        level:result.supportResult.confidence>=0.8
          ?"high"
          :result.supportResult.confidence>=0.6
            ?"medium"
            :"low",
      },
      policyCheck:{
        compliant:result.supportResult.policyIssues.length===0,
        violations:result.supportResult.policyIssues,
      },
      supportDecision:result.supportResult.decision,
      needsHuman:result.supportResult.needsHuman,
      reason:result.supportResult.reason,
    });
  }catch(error){
    if(!aiSucceeded&&reservationId){
      try{
        await releaseReplyAllowance(req.user?.id??"",reservationId);
      }catch(releaseError){
        console.error("Failed to release AI reply usage reservation:",releaseError);
      }
    }

    console.error("POST /api/reply failed:",error);
    res.status(500).json({
      message:error instanceof Error?error.message:"Failed to generate reply.",
    });
  }
});

export default router;
