import {Types} from "mongoose";
import {connectedAccountRepository} from "../repositories/ConnectedAccountRepository.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {getOutlookAccessToken} from "./outlook.js";

const MICROSOFT_GRAPH_URL="https://graph.microsoft.com/v1.0";
const MICROSOFT_IMMUTABLE_ID_HEADER='IdType="ImmutableId"';
const TRANSLATION_BATCH_SIZE=1000;

interface TranslateExchangeIdsResponse{
  value?:Array<{
    sourceId?:string;
    targetId?:string;
    errorDetails?:string;
  }>;
}

interface MigrationOptions{
  dryRun?:boolean;
  userId?:string;
}

export interface OutlookIdMigrationResult{
  users:number;
  emails:number;
  candidates:number;
  translated:number;
  updated:number;
  skipped:number;
  collisions:number;
  failed:number;
}

function chunk<T>(items:T[],size:number):T[][]{
  const chunks:T[][]=[];
  for(let index=0;index<items.length;index+=size){
    chunks.push(items.slice(index,index+size));
  }
  return chunks;
}

async function translateIds(userId:string,ids:string[]):Promise<Map<string,string>>{
  const translated=new Map<string,string>();
  for(const batch of chunk(ids,TRANSLATION_BATCH_SIZE)){
    let accessToken=await getOutlookAccessToken(userId);
    const url=`${MICROSOFT_GRAPH_URL}/me/translateExchangeIds`;
    const body=JSON.stringify({
      inputIds:batch,
      sourceIdType:"restId",
      targetIdType:"restImmutableEntryId",
    });

    let response=await fetch(url,{
      method:"POST",
      headers:{
        Authorization:`Bearer ${accessToken}`,
        "Content-Type":"application/json",
        Prefer:MICROSOFT_IMMUTABLE_ID_HEADER,
      },
      body,
    });

    if(response.status===401){
      accessToken=await getOutlookAccessToken(userId,true);
      response=await fetch(url,{
        method:"POST",
        headers:{
          Authorization:`Bearer ${accessToken}`,
          "Content-Type":"application/json",
          Prefer:MICROSOFT_IMMUTABLE_ID_HEADER,
        },
        body,
      });
    }

    if(!response.ok){
      const text=await response.text();
      throw new Error(`Microsoft Graph translateExchangeIds failed: ${response.status} ${text}`);
    }

    const data=await response.json() as TranslateExchangeIdsResponse;

    for(const item of data.value??[]){
      const sourceId=item.sourceId?.trim();
      const targetId=item.targetId?.trim();
      if(sourceId&&targetId)translated.set(sourceId,targetId);
    }
  }

  return translated;
}

export async function migrateOutlookMessageIds(options:MigrationOptions={}):Promise<OutlookIdMigrationResult>{
  if(options.userId&&!Types.ObjectId.isValid(options.userId))throw new Error("Invalid user ID.");

  const accounts=await connectedAccountRepository.findAll();
  const outlookAccounts=accounts.filter((account)=>account.provider==="outlook"&&account.connected&&(!options.userId||account.userId.toString()===options.userId));

  const result:OutlookIdMigrationResult={
    users:0,
    emails:0,
    candidates:0,
    translated:0,
    updated:0,
    skipped:0,
    collisions:0,
    failed:0,
  };

  for(const account of outlookAccounts){
    const userId=account.userId.toString();
    result.users++;

    const emails=await emailRepository.findAll(userId);
    const outlookEmails=emails.filter((email)=>email.provider==="outlook"&&Boolean(email.messageId?.trim()));
    result.emails+=outlookEmails.length;

    const uniqueIds=[...new Set(outlookEmails.map((email)=>email.messageId.trim()))];
    result.candidates+=uniqueIds.length;

    if(uniqueIds.length===0){
      console.log(`Outlook ID migration: ${userId}: no message IDs found.`);
      continue;
    }

    let translated:Map<string,string>;

    try{
      translated=await translateIds(userId,uniqueIds);
    }catch(error){
      result.failed+=uniqueIds.length;
      console.error(`Outlook ID migration failed for user ${userId}:`,error);
      continue;
    }

    result.translated+=translated.size;

    for(const email of outlookEmails){
      const sourceId=email.messageId.trim();
      const targetId=translated.get(sourceId);

      if(!targetId){
        result.skipped++;
        console.warn(`Outlook ID migration skipped ${email._id.toString()}: no translated ID for ${sourceId}`);
        continue;
      }

      if(targetId===sourceId){
        result.skipped++;
        continue;
      }

      const existing=await emailRepository.findByMessageId(userId,"outlook",targetId);

      if(existing&&existing._id.toString()!==email._id.toString()){
        result.collisions++;
        console.error(
          `Outlook ID migration collision: source ${email._id.toString()} would become ${targetId}, but ${existing._id.toString()} already uses that ID.`,
        );
        continue;
      }

      if(options.dryRun){
        result.updated++;
        console.log(
          `[dry-run] Outlook ID migration: ${email._id.toString()} ${sourceId} -> ${targetId}`,
        );
        continue;
      }

      try{
        const updated=await emailRepository.update(email._id.toString(),{
          messageId:targetId,
        });

        if(!updated){
          result.failed++;
          console.error(`Outlook ID migration failed to update email ${email._id.toString()}.`);
          continue;
        }

        result.updated++;
        console.log(
          `Outlook ID migration: ${email._id.toString()} ${sourceId} -> ${targetId}`,
        );
      }catch(error){
        result.failed++;
        console.error(`Outlook ID migration failed for email ${email._id.toString()}:`,error);
      }
    }
  }

  return result;
}
