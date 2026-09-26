import "dotenv/config";
import mongoose from "mongoose";

async function migrate(){
  const mongoUri=process.env.MONGODB_URI;
  if(!mongoUri)throw new Error("MONGODB_URI is not configured.");

  await mongoose.connect(mongoUri);
  const db=mongoose.connection.db;
  if(!db)throw new Error("MongoDB database connection is not available.");

  const emails=db.collection("emails");

  console.log("EMAIL SUPPORT PROCESSING MIGRATION START");

  const inboundPending=await emails.updateMany(
    {
      direction:"inbound",
      supportProcessingStatus:{$exists:false},
      draftId:null,
    },
    {
      $set:{
        supportProcessingStatus:"pending",
        supportProcessingError:"",
        supportProcessingAttempts:0,
        supportProcessingStartedAt:null,
        supportProcessedAt:null,
      },
    },
  );

  console.log("INBOUND EMAILS MARKED PENDING:",{
    matchedCount:inboundPending.matchedCount,
    modifiedCount:inboundPending.modifiedCount,
  });

  const inboundCompleted=await emails.updateMany(
    {
      direction:"inbound",
      supportProcessingStatus:{$exists:false},
      draftId:{$exists:true,$ne:null},
    },
    {
      $set:{
        supportProcessingStatus:"completed",
        supportProcessingError:"",
        supportProcessingAttempts:0,
        supportProcessingStartedAt:null,
        supportProcessedAt:null,
      },
    },
  );

  console.log("PROCESSED INBOUND EMAILS MARKED COMPLETED:",{
    matchedCount:inboundCompleted.matchedCount,
    modifiedCount:inboundCompleted.modifiedCount,
  });

  const outboundCompleted=await emails.updateMany(
    {
      direction:"outbound",
      supportProcessingStatus:{$exists:false},
    },
    {
      $set:{
        supportProcessingStatus:"completed",
        supportProcessingError:"",
        supportProcessingAttempts:0,
        supportProcessingStartedAt:null,
        supportProcessedAt:null,
      },
    },
  );

  console.log("OUTBOUND EMAILS MARKED COMPLETED:",{
    matchedCount:outboundCompleted.matchedCount,
    modifiedCount:outboundCompleted.modifiedCount,
  });

  const indexName="userId_1_supportProcessingStatus_1_receivedAt_-1";
  const indexes=await emails.indexes();

  const hasIndex=indexes.some((index)=>{
    const key=index.key;
    return key?.userId===1&&key?.supportProcessingStatus===1&&key?.receivedAt===-1;
  });

  if(!hasIndex){
    await emails.createIndex(
      {userId:1,supportProcessingStatus:1,receivedAt:-1},
      {name:indexName},
    );
    console.log("EMAIL SUPPORT PROCESSING INDEX CREATED:",{
      name:indexName,
    });
  }else{
    console.log("EMAIL SUPPORT PROCESSING INDEX ALREADY EXISTS:",{
      name:indexName,
    });
  }

  console.log("EMAIL SUPPORT PROCESSING MIGRATION COMPLETE");
}

migrate()
  .catch((error)=>{
    console.error("EMAIL SUPPORT PROCESSING MIGRATION FAILED:",error);
    process.exitCode=1;
  })
  .finally(async()=>{
    await mongoose.disconnect();
  });
