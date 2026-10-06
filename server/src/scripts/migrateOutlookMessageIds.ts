import mongoose from "mongoose";
import {env} from "../config/env.js";
import {migrateOutlookMessageIds} from "../services/outlookIdMigration.js";

function hasFlag(name:string):boolean{
  return process.argv.includes(name);
}

function getArgument(name:string):string|undefined{
  const index=process.argv.indexOf(name);
  if(index===-1)return undefined;
  const value=process.argv[index+1];
  return value?.trim()||undefined;
}

async function main(){
  const dryRun=hasFlag("--dry-run");
  const userId=getArgument("--user-id");

  console.log("Starting Outlook message ID migration...");
  console.log(`Mode: ${dryRun?"dry-run":"LIVE"}`);
  if(userId)console.log(`User: ${userId}`);

  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  try{
    const result=await migrateOutlookMessageIds({
      dryRun,
      userId,
    });

    console.log("");
    console.log("Outlook message ID migration completed.");
    console.log(`Users: ${result.users}`);
    console.log(`Emails scanned: ${result.emails}`);
    console.log(`Candidate IDs: ${result.candidates}`);
    console.log(`Translated IDs: ${result.translated}`);
    console.log(`${dryRun?"Would update":"Updated"}: ${result.updated}`);
    console.log(`Skipped: ${result.skipped}`);
    console.log(`Collisions: ${result.collisions}`);
    console.log(`Failed: ${result.failed}`);

    if(result.collisions>0||result.failed>0){
      process.exitCode=1;
    }
  }finally{
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

main().catch((error)=>{
  console.error("Outlook message ID migration failed:",error);
  process.exitCode=1;
});
