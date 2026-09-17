import {Router,type Request,type Response,type NextFunction} from "express";
import {auth} from "../middleware/auth.js";
import {approvals,approval,requestApproval,approve,reject,submit,deleteApproval} from "../services/approval.js";

const router=Router();

router.use(auth);

router.get("/",async(req:Request,res:Response,next:NextFunction)=>{
  try{
    const list=await approvals(req.user!.id);
    res.json(list);
  }catch(error){
    next(error);
  }
});

router.get("/:id",async(req:Request<{id:string}>,res:Response,next:NextFunction)=>{
  try{
    const item=await approval(req.params.id,req.user!.id);
    if(!item){
      res.status(404).json({message:"Approval not found"});
      return;
    }
    res.json(item);
  }catch(error){
    next(error);
  }
});

router.post("/",async(req:Request<{}, {}, {draftId:string}>,res:Response,next:NextFunction)=>{
  try{
    const {draftId}=req.body;
    if(typeof draftId!=="string"||!draftId.trim()){
      res.status(400).json({message:"Draft ID is required."});
      return;
    }
    const item=await requestApproval(draftId,req.user!.id);
    res.status(201).json(item);
  }catch(error){
    next(error);
  }
});

router.patch("/:id/approve",async(req:Request<{id:string}>,res:Response,next:NextFunction)=>{
  try{
    const item=await approve(req.params.id,req.user!.id);
    if(!item){
      res.status(404).json({message:"Approval not found"});
      return;
    }
    res.json(item);
  }catch(error){
    next(error);
  }
});

router.patch("/:id/reject",async(req:Request<{id:string},{},{comment?:string}>,res:Response,next:NextFunction)=>{
  try{
    const item=await reject(req.params.id,req.user!.id,req.body.comment);
    if(!item){
      res.status(404).json({message:"Approval not found"});
      return;
    }
    res.json(item);
  }catch(error){
    next(error);
  }
});

router.patch("/:id/submit",async(req:Request<{id:string}>,res:Response,next:NextFunction)=>{
  try{
    const item=await submit(req.params.id,req.user!.id);
    if(!item){
      res.status(404).json({message:"Approval not found"});
      return;
    }
    res.json(item);
  }catch(error){
    next(error);
  }
});

router.delete("/:id",async(req:Request<{id:string}>,res:Response,next:NextFunction)=>{
  try{
    const item=await deleteApproval(req.params.id,req.user!.id);
    if(!item){
      res.status(404).json({message:"Approval not found"});
      return;
    }
    res.json({success:true,message:"Approval deleted."});
  }catch(error){
    next(error);
  }
});

export default router;
