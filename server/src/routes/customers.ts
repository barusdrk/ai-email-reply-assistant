import {Router,type Request,type Response,type NextFunction} from "express";
import {auth} from "../middleware/auth.js";
import {customers,customer,findCustomer,createCustomer,updateCustomer,deleteCustomer} from "../services/crm.js";

const router=Router();

router.use(auth);

router.get("/",async(req:Request,res:Response,next:NextFunction)=>{
  try{
    const list=await customers(req.user!.id);
    res.json(list);
  }catch(error){
    next(error);
  }
});

router.get("/lookup",async(req:Request,res:Response,next:NextFunction)=>{
  try{
    const email=typeof req.query.email==="string"?req.query.email:"";
    if(!email.trim()){
      res.status(400).json({message:"Customer email is required."});
      return;
    }
    const item=await findCustomer(req.user!.id,email);
    if(!item){
      res.status(404).json({message:"Customer not found."});
      return;
    }
    res.json(item);
  }catch(error){
    next(error);
  }
});

router.get("/:id",async(req:Request<{id:string}>,res:Response,next:NextFunction)=>{
  try{
    const item=await customer(req.params.id,req.user!.id);
    if(!item){
      res.status(404).json({message:"Customer not found."});
      return;
    }
    res.json(item);
  }catch(error){
    next(error);
  }
});

router.post("/",async(req:Request,res:Response,next:NextFunction)=>{
  try{
    const {name,email,company,crmId,status,tags,notes}=req.body??{};
    if(typeof email!=="string"||!email.trim()){
      res.status(400).json({message:"Customer email is required."});
      return;
    }
    const item=await createCustomer(req.user!.id,{
      name,
      email,
      company,
      crmId,
      status,
      tags:Array.isArray(tags)?tags:[],
      notes,
    });
    res.status(201).json(item);
  }catch(error){
    next(error);
  }
});

router.patch("/:id",async(req:Request<{id:string}>,res:Response,next:NextFunction)=>{
  try{
    const item=await updateCustomer(req.user!.id,req.params.id,req.body??{});
    if(!item){
      res.status(404).json({message:"Customer not found."});
      return;
    }
    res.json(item);
  }catch(error){
    next(error);
  }
});

router.delete("/:id",async(req:Request<{id:string}>,res:Response,next:NextFunction)=>{
  try{
    const item=await deleteCustomer(req.user!.id,req.params.id);
    if(!item){
      res.status(404).json({message:"Customer not found."});
      return;
    }
    res.json({success:true,message:"Customer deleted."});
  }catch(error){
    next(error);
  }
});

export default router;
