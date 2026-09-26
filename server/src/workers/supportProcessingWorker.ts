import "dotenv/config";
import mongoose from "mongoose";
import EmailModel from "../models/Email.js";
import {retryFailedSupportProcessingBatch} from "../services/supportProcessingRetry.js";

const WORKER_INTERVAL_MS=60_000;
const BATCH_SIZE=10;

function getErrorMessage(error:unknown):string{
  if(error instanceof Error)return error.message;
  if(typeof error==="string")return error;
  return "Unknown error.";
}

async function processFailedSupportEmails(){
  const userIds=await EmailModel.distinct("userId",{
    direction:"inbound",
    supportProcessingStatus:"failed",
    supportProcessingAttempts:{$lt:3},
    draftId:null,
  });

  if(userIds.length===0){
    console.log("SUPPORT PROCESSING WORKER: no failed emails ready for retry.");
    return;
  }

  let totalAttempted=0;
  let totalProcessed=0;
  let totalFailed=0;
  let totalSkipped=0;

  for(const userId of userIds){
    try{
      const result=await retryFailedSupportProcessingBatch(
        String(userId),
        BATCH_SIZE,
      );

      totalAttempted+=result.attempted;
      totalProcessed+=result.processedCount;
      totalFailed+=result.failedCount;
      totalSkipped+=result.skippedCount;
    }catch(error){
      console.error("SUPPORT PROCESSING USER RETRY FAILED:",{
        userId:String(userId),
        error:getErrorMessage(error),
      });
    }
  }

  console.log("SUPPORT PROCESSING WORKER COMPLETE:",{
    users:userIds.length,
    attempted:totalAttempted,
    processed:totalProcessed,
    failed:totalFailed,
    skipped:totalSkipped,
  });
}

async function startWorker(){
  const mongoUri=process.env.MONGODB_URI;

  if(!mongoUri){
    throw new Error("MONGODB_URI is not configured.");
  }

  await mongoose.connect(mongoUri);

  console.log("SUPPORT PROCESSING WORKER STARTED:",{
    intervalMs:WORKER_INTERVAL_MS,
    batchSize:BATCH_SIZE,
  });

  await processFailedSupportEmails();

  setInterval(async()=>{
    try{
      await processFailedSupportEmails();
    }catch(error){
      console.error(
        "SUPPORT PROCESSING WORKER RUN FAILED:",
        getErrorMessage(error),
      );
    }
  },WORKER_INTERVAL_MS);
}

startWorker().catch(async(error)=>{
  console.error("SUPPORT PROCESSING WORKER FAILED:",getErrorMessage(error));
  await mongoose.disconnect();
  process.exitCode=1;
});
