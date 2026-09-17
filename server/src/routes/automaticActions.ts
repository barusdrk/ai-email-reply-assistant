import {Router,type Request,type Response} from "express";
import {auth} from "../middleware/auth.js";
import {evaluateDraftAutomation} from "../services/automation.js";
import {sendAutomatically} from "../services/automaticSend.js";

const router=Router();

router.post("/evaluate",auth,async(req:Request,res:Response)=>{
  try{
    const userId=req.user?.id;
    if(!userId||typeof userId!=="string") return res.status(401).json({message:"Unauthorized."});

    const {draftId,customerEmail,knowledgeBase}=req.body as {
      draftId?:string;
      customerEmail?:string;
      knowledgeBase?:{
        title:string;
        content:string;
        category?:string;
        tags?:string[];
      }[];
    };

    if(!draftId||typeof draftId!=="string"){
      return res.status(400).json({message:"Draft ID is required."});
    }

    const result=await evaluateDraftAutomation({
      userId,
      draftId,
      customerEmail,
      knowledgeBase,
    });

    if(!result) return res.status(404).json({message:"Draft not found."});

    return res.json(result);
  }catch(error){
    const message=error instanceof Error?error.message:"Automatic action evaluation failed.";
    if(message==="Unauthorized.") return res.status(403).json({message});
    if(message.startsWith("Invalid ")) return res.status(400).json({message});
    if(message.includes("required")) return res.status(400).json({message});
    if(message.includes("cannot be evaluated")) return res.status(400).json({message});
    return res.status(500).json({message});
  }
});

router.post("/:draftId/send",auth,async(req:Request,res:Response)=>{
  try{
    const userId=req.user?.id;
    if(!userId||typeof userId!=="string"){
      return res.status(401).json({message:"Unauthorized."});
    }

    const rawDraftId=req.params.draftId;
    const draftId=Array.isArray(rawDraftId)?rawDraftId[0]:rawDraftId;

    if(typeof draftId!=="string"||!draftId.trim()){
      return res.status(400).json({message:"Draft ID is required."});
    }

    const result=await sendAutomatically(userId,draftId);

    if(!result) return res.status(404).json({message:"Draft not found."});

    return res.json(result);
  }catch(error){
    const message=error instanceof Error?error.message:"Automatic sending failed.";
    if(message==="Unauthorized.") return res.status(403).json({message});
    if(message.startsWith("Invalid ")) return res.status(400).json({message});
    if(message.includes("not approved")) return res.status(400).json({message});
    if(message.includes("Only approved")) return res.status(400).json({message});
    if(message.includes("already been sent")) return res.status(400).json({message});
    if(message.includes("cannot be sent")) return res.status(400).json({message});
    if(message.includes("required")) return res.status(400).json({message});
    if(message.includes("Original email not found")) return res.status(404).json({message});
    return res.status(500).json({message});
  }
});

export default router;
