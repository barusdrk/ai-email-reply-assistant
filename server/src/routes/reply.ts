import {Router,type Request,type Response} from "express";
import {authenticate} from "../middleware/auth.js";
import {reserveReplyAllowance,finalizeReplyAllowance,releaseReplyAllowance} from "../services/billing.js";
import {generateReplyForUser} from "../services/ai.js";
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

    const {email,tone="professional",length="medium",signature}=req.body;

    if(typeof email!=="string"||!email.trim()){
      res.status(400).json({message:"Email is required."});
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

    const result=await generateReplyForUser(req.user.id,{
      email,
      tone:tone as Tone,
      length:length as ReplyLength,
      signature:typeof signature==="string"?signature:undefined,
    });

    aiSucceeded=true;

    if(!result.reply.trim()){
      await releaseReplyAllowance(req.user.id,reservationId);
      reservationId=null;
      res.status(500).json({message:"AI returned an empty reply."});
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

    res.json({success:true,...result});
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
