import {Router} from "express";
import {Types} from "mongoose";
import {auth} from "../middleware/auth.js";
import {email,inbox,sent,syncInbox,syncAllInboxes,syncSent,syncAllSent,sendEmail} from "../services/email.js";
import {classifyEmail} from "../services/emailClassification.js";
import {identifyCustomer} from "../services/customerIdentification.js";
import {EmailModel} from "../models/Email.js";
import {listEmails as listOutlookEmails} from "../services/outlook.js";
import {retryFailedSupportProcessing,retryFailedSupportProcessingBatch} from "../services/supportProcessingRetry.js";

const router=Router();
router.use(auth);

router.post("/:id/classify",async(req,res)=>{
  try{
    if(!req.user?.id)return res.status(401).json({success:false,message:"Authentication required."});
    const userId=req.user.id;
    const {id}=req.params;
    if(!Types.ObjectId.isValid(id))return res.status(400).json({success:false,message:"Invalid email ID."});
    const emailRecord=await EmailModel.findOne({_id:new Types.ObjectId(id),userId:new Types.ObjectId(userId)});
    if(!emailRecord)return res.status(404).json({success:false,message:"Email not found."});
    const result=await classifyEmail(emailRecord.body||emailRecord.preview||"",userId);
    emailRecord.classification={category:result.category,confidence:result.confidence};
    await emailRecord.save();
    return res.json({success:true,classification:emailRecord.classification});
  }catch(error){
    console.error("Email classification failed:",error);
    return res.status(500).json({success:false,message:error instanceof Error?error.message:"Failed to classify email."});
  }
});

router.post("/:id/identify-customer",async(req,res)=>{
  try{
    if(!req.user?.id)return res.status(401).json({success:false,message:"Authentication required."});
    const userId=req.user.id;
    const {id}=req.params;
    if(!Types.ObjectId.isValid(id))return res.status(400).json({success:false,message:"Invalid email ID."});
    const emailRecord=await EmailModel.findOne({_id:new Types.ObjectId(id),userId:new Types.ObjectId(userId)});
    if(!emailRecord)return res.status(404).json({success:false,message:"Email not found."});
    const senderEmail=emailRecord.senderEmail?.trim()||"";
    if(!senderEmail)return res.status(400).json({success:false,message:"The email does not contain a customer email address."});
    const result=await identifyCustomer(senderEmail,userId);
    if(result.customerId){
      emailRecord.customerId=new Types.ObjectId(result.customerId);
      await emailRecord.save();
    }
    return res.json({success:true,customerId:result.customerId,customer:result.customer,matched:result.matched});
  }catch(error){
    console.error("Customer identification failed:",error);
    return res.status(500).json({success:false,message:error instanceof Error?error.message:"Failed to identify customer."});
  }
});

router.get("/",async(req,res)=>{
  try{
    if(!req.user?.id)return res.status(401).json({success:false,message:"Authentication required."});
    const page=Math.max(1,Number(req.query.page??1));
    const limit=Math.min(100,Math.max(1,Number(req.query.limit??50)));
    const result=await inbox(req.user.id,{page,limit});
    return res.json({success:true,...result});
  }catch(error){
    console.error("Inbox retrieval failed:",error);
    return res.status(500).json({success:false,message:error instanceof Error?error.message:"Failed to load inbox."});
  }
});

router.get("/sent",async(req,res)=>{
  try{
    if(!req.user?.id)return res.status(401).json({success:false,message:"Authentication required."});
    const page=Math.max(1,Number(req.query.page??1));
    const limit=Math.min(100,Math.max(1,Number(req.query.limit??50)));
    const result=await sent(req.user.id,{page,limit});
    return res.json({success:true,...result});
  }catch(error){
    console.error("Sent email retrieval failed:",error);
    return res.status(500).json({success:false,message:error instanceof Error?error.message:"Failed to load sent emails."});
  }
});

router.post("/sync",async(req,res)=>{
  try{
    if(!req.user?.id)return res.status(401).json({success:false,message:"Authentication required."});
    const provider=req.body?.provider;
    if(provider!==undefined&&provider!=="gmail"&&provider!=="outlook"){
      return res.status(400).json({success:false,message:"Provider must be gmail or outlook."});
    }
    const result=provider?await syncInbox(provider,req.user.id):await syncAllInboxes(req.user.id);
    return res.json({success:true,...result});
  }catch(error){
    console.error("Inbox synchronization failed:",error);
    return res.status(400).json({success:false,message:error instanceof Error?error.message:"Failed to synchronize inbox."});
  }
});

router.post("/sent/sync",async(req,res)=>{
  try{
    if(!req.user?.id)return res.status(401).json({success:false,message:"Authentication required."});
    const provider=req.body?.provider;
    if(provider!==undefined&&provider!=="gmail"&&provider!=="outlook"){
      return res.status(400).json({success:false,message:"Provider must be gmail or outlook."});
    }
    const result=provider?await syncSent(provider,req.user.id):await syncAllSent(req.user.id);
    return res.json({success:true,...result});
  }catch(error){
    console.error("Sent email synchronization failed:",error);
    return res.status(400).json({success:false,message:error instanceof Error?error.message:"Failed to synchronize sent emails."});
  }
});

router.post("/gmail/sync",async(req,res)=>{
  try{
    if(!req.user?.id)return res.status(401).json({success:false,message:"Authentication required."});
    const result=await syncInbox("gmail",req.user.id);
    return res.json({success:true,...result});
  }catch(error){
    console.error("Gmail inbox synchronization failed:",error);
    return res.status(400).json({success:false,message:error instanceof Error?error.message:"Failed to synchronize Gmail inbox."});
  }
});

router.post("/outlook/sync",async(req,res)=>{
  try{
    if(!req.user?.id)return res.status(401).json({success:false,message:"Authentication required."});
    const result=await syncInbox("outlook",req.user.id);
    return res.json({success:true,...result});
  }catch(error){
    console.error("Outlook inbox synchronization failed:",error);
    return res.status(400).json({success:false,message:error instanceof Error?error.message:"Failed to synchronize Outlook inbox."});
  }
});

router.post("/gmail/sent/sync",async(req,res)=>{
  try{
    if(!req.user?.id)return res.status(401).json({success:false,message:"Authentication required."});
    const result=await syncSent("gmail",req.user.id);
    return res.json({success:true,...result});
  }catch(error){
    console.error("Gmail sent synchronization failed:",error);
    return res.status(400).json({success:false,message:error instanceof Error?error.message:"Failed to synchronize Gmail sent items."});
  }
});

router.post("/outlook/sent/sync",async(req,res)=>{
  try{
    if(!req.user?.id)return res.status(401).json({success:false,message:"Authentication required."});
    const result=await syncSent("outlook",req.user.id);
    return res.json({success:true,...result});
  }catch(error){
    console.error("Outlook sent synchronization failed:",error);
    return res.status(400).json({success:false,message:error instanceof Error?error.message:"Failed to synchronize Outlook sent items."});
  }
});

router.get("/outlook/test",async(req,res)=>{
  try{
    if(!req.user?.id)return res.status(401).json({success:false,message:"Authentication required."});
    const emails=await listOutlookEmails(req.user.id);
    return res.json({success:true,emails});
  }catch(error){
    console.error("Outlook test failed:",error);
    return res.status(400).json({success:false,message:error instanceof Error?error.message:"Failed to retrieve Outlook emails."});
  }
});

router.post("/support-processing/retry-failed",async(req,res)=>{
  try{
    if(!req.user?.id)return res.status(401).json({success:false,message:"Authentication required."});
    const limit=Number(req.body?.limit??10);
    const result=await retryFailedSupportProcessingBatch(
      req.user.id,
      Number.isFinite(limit)?limit:10,
    );
    return res.json({success:true,...result});
  }catch(error){
    console.error("Failed support processing batch retry failed:",error);
    return res.status(400).json({success:false,message:error instanceof Error?error.message:"Failed to retry support processing."});
  }
});

router.post("/:id/support-processing/retry",async(req,res)=>{
  try{
    if(!req.user?.id)return res.status(401).json({success:false,message:"Authentication required."});
    const {id}=req.params;
    if(!Types.ObjectId.isValid(id))return res.status(400).json({success:false,message:"Invalid email ID."});
    const result=await retryFailedSupportProcessing(req.user.id,id);
    return res.json({success:true,email:result});
  }catch(error){
    console.error("Failed support processing retry:",error);
    return res.status(400).json({success:false,message:error instanceof Error?error.message:"Failed to retry support processing."});
  }
});

router.post("/send",async(req,res)=>{
  try{
    if(!req.user?.id)return res.status(401).json({success:false,message:"Authentication required."});
    const userId=req.user.id;
    const {provider,to,subject,body,emailId,threadId,inReplyTo,references,originalMessageId,originalMessageIdHeader}=req.body??{};
    if(provider!=="gmail"&&provider!=="outlook")return res.status(400).json({success:false,message:"Provider must be gmail or outlook."});
    if(typeof to!=="string"||!to.trim())return res.status(400).json({success:false,message:"Recipient email is required."});
    if(typeof subject!=="string"||!subject.trim())return res.status(400).json({success:false,message:"Subject is required."});
    if(typeof body!=="string"||!body.trim())return res.status(400).json({success:false,message:"Email body is required."});
    if(typeof emailId!=="string"||!Types.ObjectId.isValid(emailId))return res.status(400).json({success:false,message:"A valid source email ID is required."});
    const sourceEmail=await EmailModel.findOne({_id:new Types.ObjectId(emailId),userId:new Types.ObjectId(userId)}).lean();
    if(!sourceEmail)return res.status(404).json({success:false,message:"Source email not found."});
    if(sourceEmail.provider!==provider)return res.status(400).json({success:false,message:"Provider does not match the source email."});
    const result=await sendEmail(userId,{
      provider,
      to:to.trim(),
      subject:subject.trim(),
      body:body.trim(),
      threadId:typeof threadId==="string"?threadId:undefined,
      inReplyTo:typeof inReplyTo==="string"?inReplyTo:undefined,
      references:Array.isArray(references)?references.filter((value):value is string=>typeof value==="string"):undefined,
      originalMessageId:typeof originalMessageId==="string"?originalMessageId:undefined,
      originalMessageIdHeader:typeof originalMessageIdHeader==="string"?originalMessageIdHeader:undefined,
    });
    return res.json({success:true,result});
  }catch(error){
    console.error("Email sending failed:",error);
    return res.status(400).json({success:false,message:error instanceof Error?error.message:"Failed to send email."});
  }
});

router.get("/:id",async(req,res)=>{
  try{
    if(!req.user?.id)return res.status(401).json({success:false,message:"Authentication required."});
    const {id}=req.params;
    if(!Types.ObjectId.isValid(id))return res.status(400).json({success:false,message:"Invalid email ID."});
    const result=await email(id,req.user.id);
    if(!result)return res.status(404).json({success:false,message:"Email not found."});
    return res.json({success:true,email:result});
  }catch(error){
    console.error("Email retrieval failed:",error);
    return res.status(500).json({success:false,message:error instanceof Error?error.message:"Failed to load email."});
  }
});

export default router;
