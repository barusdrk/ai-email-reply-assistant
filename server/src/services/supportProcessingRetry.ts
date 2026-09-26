import {Types} from "mongoose";
import EmailModel from "../models/Email.js";
import {processNewInboundEmail} from "./supportProcessor.js";

const MAX_RETRY_ATTEMPTS=3;

function getErrorMessage(error:unknown):string{
  if(error instanceof Error)return error.message;
  if(typeof error==="string")return error;
  return "Unknown support processing error.";
}

export async function retryFailedSupportProcessing(
  userId:string,
  emailId:string,
){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  if(!Types.ObjectId.isValid(emailId))throw new Error("Invalid email ID.");

  const email=await EmailModel.findOneAndUpdate(
    {
      _id:new Types.ObjectId(emailId),
      userId:new Types.ObjectId(userId),
      direction:"inbound",
      supportProcessingStatus:"failed",
      supportProcessingAttempts:{$lt:MAX_RETRY_ATTEMPTS},
      draftId:null,
    },
    {
      $set:{
        supportProcessingStatus:"processing",
        supportProcessingError:"",
        supportProcessingStartedAt:new Date(),
        supportProcessedAt:null,
      },
      $inc:{
        supportProcessingAttempts:1,
      },
    },
    {
      new:true,
    },
  );

  if(!email){
    const existing=await EmailModel.findOne({
      _id:new Types.ObjectId(emailId),
      userId:new Types.ObjectId(userId),
    }).select(
      "direction supportProcessingStatus supportProcessingAttempts draftId",
    ).lean();

    if(!existing)throw new Error("Email not found.");

    if(existing.direction!=="inbound"){
      throw new Error("Only inbound emails can be retried.");
    }

    if(existing.draftId){
      throw new Error("This email already has a draft and cannot be retried.");
    }

    if(existing.supportProcessingStatus!=="failed"){
      throw new Error("Only failed email processing can be retried.");
    }

    if(existing.supportProcessingAttempts>=MAX_RETRY_ATTEMPTS){
      throw new Error(
        `Maximum support processing retry attempts (${MAX_RETRY_ATTEMPTS}) reached.`,
      );
    }

    throw new Error("Email processing is already being retried.");
  }

  const id=email._id.toString();

  try{
    await processNewInboundEmail(userId,id);

    await EmailModel.updateOne(
      {
        _id:email._id,
        userId:new Types.ObjectId(userId),
        supportProcessingStatus:"processing",
      },
      {
        $set:{
          supportProcessingStatus:"completed",
          supportProcessingError:"",
          supportProcessedAt:new Date(),
        },
        $unset:{
          supportProcessingStartedAt:1,
        },
      },
    );

    return await EmailModel.findOne({
      _id:email._id,
      userId:new Types.ObjectId(userId),
    });
  }catch(error){
    const message=getErrorMessage(error);

    const current=await EmailModel.findOne({
      _id:email._id,
      userId:new Types.ObjectId(userId),
    }).select("draftId").lean();

    const errorMessage=current?.draftId
      ? `${message} A draft was created during processing; automatic retry is disabled for this email.`
      : message;

    await EmailModel.updateOne(
      {
        _id:email._id,
        userId:new Types.ObjectId(userId),
        supportProcessingStatus:"processing",
      },
      {
        $set:{
          supportProcessingStatus:"failed",
          supportProcessingError:errorMessage,
        },
        $unset:{
          supportProcessingStartedAt:1,
          supportProcessedAt:1,
        },
      },
    );

    throw error;
  }
}

const RETRY_BACKOFF_MS=[60_000,300_000];

function getRetryDelay(attempts:number):number|null{
  if(attempts<1)return 60_000;
  if(attempts>RETRY_BACKOFF_MS.length)return null;
  return RETRY_BACKOFF_MS[attempts-1];
}

export async function retryFailedSupportProcessingBatch(
  userId:string,
  limit=10,
){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

  const safeLimit=Math.min(Math.max(Math.floor(limit),1),50);
  const now=Date.now();

  const candidates=await EmailModel.find({
    userId:new Types.ObjectId(userId),
    direction:"inbound",
    supportProcessingStatus:"failed",
    supportProcessingAttempts:{$lt:MAX_RETRY_ATTEMPTS},
    draftId:null,
  })
    .sort({updatedAt:1})
    .limit(safeLimit)
    .select("_id supportProcessingAttempts updatedAt")
    .lean();

  const eligible=candidates.filter((candidate)=>{
    if(!candidate.updatedAt)return true;

    const delay=getRetryDelay(candidate.supportProcessingAttempts);

    if(delay===null)return false;

    return now-candidate.updatedAt.getTime()>=delay;
  });

  let processedCount=0;
  let failedCount=0;
  let skippedCount=candidates.length-eligible.length;

  for(const candidate of eligible){
    try{
      await retryFailedSupportProcessing(
        userId,
        candidate._id.toString(),
      );
      processedCount++;
    }catch(error){
      failedCount++;
      console.error("SUPPORT PROCESSING RETRY FAILED:",{
        userId,
        emailId:candidate._id.toString(),
        error:getErrorMessage(error),
      });
    }
  }

  return{
    attempted:eligible.length,
    processedCount,
    failedCount,
    skippedCount,
  };
}
