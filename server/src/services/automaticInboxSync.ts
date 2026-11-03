import ConnectedAccountModel from "../models/ConnectedAccount.js";
import {syncInbox,type EmailProvider} from "./email.js";

interface ConnectedInboxAccount {
  userId:unknown;
  provider:EmailProvider;
}

let syncInProgress=false;

export interface AutomaticInboxSyncResult {
  accounts:number;
  processed:number;
  failed:number;
  skipped:boolean;
}

export async function syncConnectedInboxes():Promise<AutomaticInboxSyncResult>{
  if(syncInProgress){
    console.log("AUTOMATIC INBOX SYNC SKIPPED: previous run is still in progress.");
    return {accounts:0,processed:0,failed:0,skipped:true};
  }

  syncInProgress=true;
  let processed=0;
  let failed=0;

  try{
    const connectedAccounts=await ConnectedAccountModel.find({connected:true})
      .select("userId provider")
      .lean();

    const uniqueAccounts=new Map<string,ConnectedInboxAccount>();
    for(const account of connectedAccounts){
      if(!account.userId||(account.provider!=="gmail"&&account.provider!=="outlook"))continue;
      const userId=String(account.userId);
      uniqueAccounts.set(`${userId}:${account.provider}`,{
        userId,
        provider:account.provider,
      });
    }

    console.log("AUTOMATIC INBOX SYNC START:",{accounts:uniqueAccounts.size});

    for(const account of uniqueAccounts.values()){
      try{
        const result=await syncInbox(account.provider,String(account.userId));
        processed+=result.processedCount;
        failed+=result.failedCount;
      }catch(error){
        failed++;
        console.error("AUTOMATIC INBOX SYNC ACCOUNT FAILED:",{
          provider:account.provider,
          userId:String(account.userId),
          error:error instanceof Error?error.message:String(error),
        });
      }
    }

    const result={accounts:uniqueAccounts.size,processed,failed,skipped:false};
    console.log("AUTOMATIC INBOX SYNC COMPLETE:",result);
    return result;
  }finally{
    syncInProgress=false;
  }
}
