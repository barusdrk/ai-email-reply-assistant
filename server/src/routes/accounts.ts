import {Router,type Request,type Response} from "express";
import {auth} from "../middleware/auth.js";
import {getGmailAuthUrl,connectGmail,verifyGmailOAuthState,gmailStatus,disconnectGmail} from "../services/gmail.js";
import {getMicrosoftAuthUrl,exchangeMicrosoftCode,outlookStatus,disconnectOutlook} from "../services/outlook.js";
import UserModel from "../models/User.js";

const router=Router();
const clientUrl=(process.env.CLIENT_URL??"http://localhost:5173").split(",")[0].trim();

router.get("/gmail/callback",async(req:Request,res:Response)=>{
  try{
    const code=typeof req.query.code==="string"?req.query.code:"";
    const state=typeof req.query.state==="string"?req.query.state:"";
    const googleError=typeof req.query.error==="string"?req.query.error:"";
    console.log("Gmail OAuth callback received.");
    console.log("Gmail OAuth code received:",Boolean(code));
    if(googleError){
      console.warn("Gmail OAuth denied:",googleError);
      res.redirect(`${clientUrl}/settings?gmail=error`);
      return;
    }
    if(!code||!state){
      res.status(400).send("Missing Google authorization code or state.");
      return;
    }
    const userId=verifyGmailOAuthState(state);
    const account=await connectGmail(userId,code);
    await UserModel.findOneAndUpdate({_id:userId,activeEmailProvider:null},{activeEmailProvider:"gmail"});
    console.log("Gmail account connected:",account?.email??"");
    res.redirect(`${clientUrl}/settings?gmail=connected`);
  }catch(error){
    console.error("Gmail OAuth callback error:",error);
    res.redirect(`${clientUrl}/settings?gmail=error`);
  }
});

router.get("/outlook/callback",async(req:Request,res:Response)=>{
  try{
    const code=typeof req.query.code==="string"?req.query.code:"";
    const state=typeof req.query.state==="string"?req.query.state:"";
    const microsoftError=typeof req.query.error==="string"?req.query.error:"";
    console.log("Outlook OAuth callback received.");
    console.log("Outlook OAuth code received:",Boolean(code));
    if(microsoftError){
      console.warn("Outlook OAuth denied:",microsoftError);
      res.redirect(`${clientUrl}/settings?outlook=error`);
      return;
    }
    if(!code||!state){
      res.status(400).send("Missing Microsoft authorization code or state.");
      return;
    }
    const account=await exchangeMicrosoftCode(code,state);
    await UserModel.findOneAndUpdate({_id:account.userId,activeEmailProvider:null},{activeEmailProvider:"outlook"});
    console.log("Outlook account connected:",account.email);
    res.redirect(`${clientUrl}/settings?outlook=connected`);
  }catch(error){
    console.error("Outlook OAuth callback error:",error);
    res.redirect(`${clientUrl}/settings?outlook=error`);
  }
});

router.use(auth);

router.get("/",async(req:Request,res:Response)=>{
  if(!req.user){
    res.status(401).json({success:false,message:"Authentication required."});
    return;
  }
  try{
    const user=await UserModel.findById(req.user.id).select("activeEmailProvider").lean();
    const [gmail,outlook]=await Promise.all([
      gmailStatus(req.user.id),
      outlookStatus(req.user.id),
    ]);
    let activeProvider=user?.activeEmailProvider??null;
    if(activeProvider==="gmail"&&!gmail.connected)activeProvider=outlook.connected?"outlook":null;
    if(activeProvider==="outlook"&&!outlook.connected)activeProvider=gmail.connected?"gmail":null;
    if(activeProvider!==user?.activeEmailProvider){
      await UserModel.findByIdAndUpdate(req.user.id,{activeEmailProvider:activeProvider});
    }
    res.json({success:true,gmail,outlook,activeProvider});
  }catch(error){
    console.error("Account status error:",error);
    res.status(500).json({success:false,message:error instanceof Error?error.message:"Failed to load account status."});
  }
});

router.put("/provider",async(req:Request,res:Response)=>{
  if(!req.user){
    res.status(401).json({success:false,message:"Authentication required."});
    return;
  }
  try{
    const provider=req.body?.provider;
    if(provider!=="gmail"&&provider!=="outlook"){
      res.status(400).json({success:false,message:"Provider must be gmail or outlook."});
      return;
    }
    const [gmail,outlook]=await Promise.all([
      gmailStatus(req.user.id),
      outlookStatus(req.user.id),
    ]);
    if(provider==="gmail"&&!gmail.connected){
      res.status(400).json({success:false,message:"Gmail is not connected."});
      return;
    }
    if(provider==="outlook"&&!outlook.connected){
      res.status(400).json({success:false,message:"Outlook is not connected."});
      return;
    }
    await UserModel.findByIdAndUpdate(req.user.id,{activeEmailProvider:provider});
    res.json({success:true,activeProvider:provider});
  }catch(error){
    console.error("Active provider update error:",error);
    res.status(500).json({success:false,message:error instanceof Error?error.message:"Failed to update active email provider."});
  }
});

router.get("/gmail/connect",async(req:Request,res:Response)=>{
  if(!req.user){
    res.status(401).json({success:false,message:"Authentication required."});
    return;
  }
  try{
    const url=getGmailAuthUrl(req.user.id);
    res.json({success:true,url});
  }catch(error){
    console.error("Gmail connect error:",error);
    res.status(500).json({success:false,message:error instanceof Error?error.message:"Failed to create Gmail authorization URL."});
  }
});

router.get("/gmail/status",async(req:Request,res:Response)=>{
  if(!req.user){
    res.status(401).json({success:false,message:"Authentication required."});
    return;
  }
  try{
    const status=await gmailStatus(req.user.id);
    res.json({success:true,...status});
  }catch(error){
    console.error("Gmail status error:",error);
    res.status(500).json({success:false,message:error instanceof Error?error.message:"Failed to load Gmail status."});
  }
});

router.delete("/gmail",async(req:Request,res:Response)=>{
  if(!req.user){
    res.status(401).json({success:false,message:"Authentication required."});
    return;
  }
  try{
    await disconnectGmail(req.user.id);
    const outlook=await outlookStatus(req.user.id);
    const user=await UserModel.findById(req.user.id).select("activeEmailProvider").lean();
    let activeProvider=user?.activeEmailProvider??null;
    if(activeProvider==="gmail"){
      activeProvider=outlook.connected?"outlook":null;
      await UserModel.findByIdAndUpdate(req.user.id,{activeEmailProvider:activeProvider});
    }
    res.json({success:true,gmail:false,activeProvider});
  }catch(error){
    console.error("Gmail disconnect error:",error);
    res.status(500).json({success:false,message:error instanceof Error?error.message:"Failed to disconnect Gmail."});
  }
});

router.get("/outlook/connect",async(req:Request,res:Response)=>{
  if(!req.user){
    res.status(401).json({success:false,message:"Authentication required."});
    return;
  }
  try{
    const url=getMicrosoftAuthUrl(req.user.id);
    res.json({success:true,url});
  }catch(error){
    console.error("Outlook connect error:",error);
    res.status(500).json({success:false,message:error instanceof Error?error.message:"Failed to create Outlook authorization URL."});
  }
});

router.get("/outlook/status",async(req:Request,res:Response)=>{
  if(!req.user){
    res.status(401).json({success:false,message:"Authentication required."});
    return;
  }
  try{
    const status=await outlookStatus(req.user.id);
    res.json({success:true,...status});
  }catch(error){
    console.error("Outlook status error:",error);
    res.status(500).json({success:false,message:error instanceof Error?error.message:"Failed to load Outlook status."});
  }
});

router.delete("/outlook",async(req:Request,res:Response)=>{
  if(!req.user){
    res.status(401).json({success:false,message:"Authentication required."});
    return;
  }
  try{
    await disconnectOutlook(req.user.id);
    const gmail=await gmailStatus(req.user.id);
    const user=await UserModel.findById(req.user.id).select("activeEmailProvider").lean();
    let activeProvider=user?.activeEmailProvider??null;
    if(activeProvider==="outlook"){
      activeProvider=gmail.connected?"gmail":null;
      await UserModel.findByIdAndUpdate(req.user.id,{activeEmailProvider:activeProvider});
    }
    res.json({success:true,outlook:false,activeProvider});
  }catch(error){
    console.error("Outlook disconnect error:",error);
    res.status(500).json({success:false,message:error instanceof Error?error.message:"Failed to disconnect Outlook."});
  }
});

export default router;
