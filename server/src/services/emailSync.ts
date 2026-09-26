import {Types} from "mongoose";
import {emailRepository} from "../repositories/EmailRepository.js";
import {customerRepository} from "../repositories/CustomerRepository.js";
import {connectedAccountRepository} from "../repositories/ConnectedAccountRepository.js";
import {draftRepository} from "../repositories/DraftRepository.js";
import {listEmails as listGmailEmails,type InboxEmail as GmailInboxEmail,listSentEmails as listGmailSentEmails,type SentEmail as GmailSentEmail} from "./gmail.js";
import {listEmails as listOutlookEmails,type InboxEmail as OutlookInboxEmail,listSentEmails as listOutlookSentEmails,type SentEmail as OutlookSentEmail} from "./outlook.js";
import {createDraft} from "./drafts.js";

type EmailProvider="gmail"|"outlook";
type EmailDirection="inbound"|"outbound";

export type NormalizedEmail={
  userId:Types.ObjectId;
  provider:EmailProvider;
  direction:EmailDirection;
  messageId:string;
  messageIdHeader:string;
  references:string[];
  threadId:string;
  subject:string;
  from:string;
  senderName:string;
  senderEmail:string;
  recipientName:string;
  recipientEmail:string;
  preview:string;
  body:string;
  unread:boolean;
  archived:boolean;
  receivedAt:Date;
};

export interface SyncResult{
  provider:EmailProvider;
  direction:EmailDirection;
  synced:number;
  created:number;
  updated:number;
  failed:number;
  newEmails:NormalizedEmail[];
  emails:Awaited<ReturnType<typeof emailRepository.findAll>>;
}

function normalizeAddress(value:string):string{
  return value.trim().toLowerCase();
}

function extractEmailAddress(value:string):string{
  const match=value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.trim().toLowerCase()??"";
}

function extractDisplayName(value:string,email:string):string{
  if(!value)return "";
  if(!email)return value.replace(/[<>]/g,"").trim();
  return value.replace(email,"").replace(/^["']|["']$/g,"").replace(/[<>]/g,"").trim();
}

function isCustomerMessage(email:NormalizedEmail,accountEmail?:string):boolean{
  if(email.direction!=="inbound")return false;
  const senderEmail=normalizeAddress(email.senderEmail||extractEmailAddress(email.from));
  const connectedEmail=normalizeAddress(accountEmail??"");
  if(!senderEmail)return false;
  if(connectedEmail&&senderEmail===connectedEmail)return false;
  return true;
}

function normalizeGmailEmail(userId:string,email:GmailInboxEmail):NormalizedEmail{
  return {
    userId:new Types.ObjectId(userId),
    provider:"gmail",
    direction:"inbound",
    messageId:email.id,
    messageIdHeader:email.messageIdHeader??"",
    references:email.references??[],
    threadId:email.threadId??"",
    subject:email.subject??"",
    from:email.from??"",
    senderName:email.senderName??"",
    senderEmail:email.senderEmail??"",
    recipientName:"",
    recipientEmail:"",
    preview:email.preview??"",
    body:email.body??"",
    unread:email.unread??true,
    archived:email.archived??false,
    receivedAt:email.receivedAt??new Date(),
  };
}

function normalizeOutlookEmail(userId:string,email:OutlookInboxEmail):NormalizedEmail{
  const from=email.from?.trim()??"";
  const senderEmail=extractEmailAddress(from);
  const senderName=extractDisplayName(from,senderEmail);
  return {
    userId:new Types.ObjectId(userId),
    provider:"outlook",
    direction:"inbound",
    messageId:email.id,
    messageIdHeader:"",
    references:[],
    threadId:email.threadId??"",
    subject:email.subject??"",
    from,
    senderName,
    senderEmail,
    recipientName:"",
    recipientEmail:"",
    preview:email.preview??"",
    body:email.body??"",
    unread:email.unread??true,
    archived:email.archived??false,
    receivedAt:email.receivedAt??new Date(),
  };
}

function normalizeGmailSentEmail(userId:string,email:GmailSentEmail):NormalizedEmail{
  return {
    userId:new Types.ObjectId(userId),
    provider:"gmail",
    direction:"outbound",
    messageId:email.id,
    messageIdHeader:email.messageIdHeader??"",
    references:email.references??[],
    threadId:email.threadId??"",
    subject:email.subject??"",
    from:email.from??"",
    senderName:email.senderName??"",
    senderEmail:email.senderEmail??"",
    recipientName:email.recipientName??"",
    recipientEmail:email.recipientEmail??"",
    preview:email.preview??"",
    body:email.body??"",
    unread:false,
    archived:false,
    receivedAt:email.receivedAt??new Date(),
  };
}

function normalizeOutlookSentEmail(userId:string,email:OutlookSentEmail):NormalizedEmail{
  return {
    userId:new Types.ObjectId(userId),
    provider:"outlook",
    direction:"outbound",
    messageId:email.id,
    messageIdHeader:"",
    references:[],
    threadId:email.threadId??"",
    subject:email.subject??"",
    from:email.from??"",
    senderName:extractDisplayName(email.from??"",extractEmailAddress(email.from??"")),
    senderEmail:extractEmailAddress(email.from??""),
    recipientName:email.recipientName??"",
    recipientEmail:email.recipientEmail??"",
    preview:email.preview??"",
    body:email.body??"",
    unread:false,
    archived:false,
    receivedAt:email.receivedAt??new Date(),
  };
}

async function linkEmailsToCustomers(
  userId:string,
  emails:NormalizedEmail[],
  accountEmail?:string,
){
  let linked=0,skipped=0,failed=0;

  for(const email of emails){
    try{
      if(!isCustomerMessage(email,accountEmail)){
        skipped++;
        continue;
      }

      const senderEmail=normalizeAddress(
        email.senderEmail||
        extractEmailAddress(email.from),
      );

      if(!senderEmail){
        skipped++;
        continue;
      }

      const customer=await customerRepository.findOrCreate(
        userId,
        senderEmail,
        {
          name:email.senderName,
        },
      );

      if(!customer){
        skipped++;
        continue;
      }

      const storedEmail=await emailRepository.findByMessageId(
        userId,
        email.provider,
        email.messageId,
      );

      if(!storedEmail){
        skipped++;
        continue;
      }

      if(
        !storedEmail.customerId||
        storedEmail.customerId.toString()!==customer._id.toString()
      ){
        await emailRepository.update(
          storedEmail._id.toString(),
          {
            customerId:customer._id,
          },
        );
      }

      linked++;
    }catch(error){
      failed++;

      console.error(
        "CRM customer linking failed:",
        {
          provider:email.provider,
          messageId:email.messageId,
          senderEmail:email.senderEmail,
          error:error instanceof Error
            ?error.message
            :error,
        },
      );
    }
  }

  return {
    linked,
    skipped,
    failed,
  };
}

async function generateDraftsForNewEmails(userId:string,emails:NormalizedEmail[],accountEmail?:string){
  let created=0,skipped=0,failed=0;
  const inboundEmails=emails.filter((email)=>email.direction==="inbound");
  const storedEmails=await emailRepository.findAll(userId);
  for(const email of inboundEmails){
    try{
      if(!isCustomerMessage(email,accountEmail)){skipped++;continue;}
      if(!email.body.trim()){skipped++;continue;}
      const storedEmail=storedEmails.find((stored)=>stored.provider===email.provider&&stored.messageId===email.messageId);
      if(!storedEmail){skipped++;continue;}
      const existingDraft=await draftRepository.findByEmailId(storedEmail._id.toString());
      if(existingDraft){skipped++;continue;}
      await createDraft({
        userId,
        emailId:storedEmail._id.toString(),
        provider:email.provider,
        subject:email.subject,
        customer:email.senderEmail||email.senderName,
        email:email.body,
      });
      created++;
    }catch(error){
      failed++;
      console.error("Automatic draft generation failed:",{
        provider:email.provider,
        messageId:email.messageId,
        senderEmail:email.senderEmail,
        error:error instanceof Error?error.message:error,
      });
    }
  }
  return {created,skipped,failed};
}

async function syncProvider(userId:string,provider:EmailProvider,direction:EmailDirection,sourceEmails:NormalizedEmail[]):Promise<SyncResult>{
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

  const existingEmails=await emailRepository.findAll(userId);
  const existingIds=new Set(
    existingEmails
      .filter((email)=>email.provider===provider&&email.direction===direction)
      .map((email)=>email.messageId),
  );

  const newEmails=sourceEmails.filter((email)=>!existingIds.has(email.messageId));

  console.log("Email provider sync:",{
    provider,
    direction,
    sourceCount:sourceEmails.length,
    newCount:newEmails.length,
    newest:sourceEmails[0]?{
      messageId:sourceEmails[0].messageId,
      subject:sourceEmails[0].subject,
      receivedAt:sourceEmails[0].receivedAt,
    }:null,
    oldest:sourceEmails.length>0?{
      messageId:sourceEmails[sourceEmails.length-1].messageId,
      subject:sourceEmails[sourceEmails.length-1].subject,
      receivedAt:sourceEmails[sourceEmails.length-1].receivedAt,
    }:null,
  });

  if(sourceEmails.length>0)await emailRepository.bulkUpsert(sourceEmails);

  const account=await connectedAccountRepository.findByProvider(userId,provider);

  if(direction==="inbound"){
    const customerResult=await linkEmailsToCustomers(userId,sourceEmails,account?.email);
    console.log("CRM customer linking:",{
      provider,
      emails:sourceEmails.length,
      linked:customerResult.linked,
      skipped:customerResult.skipped,
      failed:customerResult.failed,
    });

    if(newEmails.length>0){
      const draftResult=await generateDraftsForNewEmails(userId,newEmails,account?.email);
      console.log("Automatic draft generation:",{
        provider,
        newEmails:newEmails.length,
        draftsCreated:draftResult.created,
        draftsSkipped:draftResult.skipped,
        draftsFailed:draftResult.failed,
      });
    }
  }

  if(account){
    await connectedAccountRepository.update(account._id.toString(),{
      syncStatus:"idle",
      lastSyncAt:new Date(),
      lastError:"",
      connected:true,
    });
  }

  const storedEmails=await emailRepository.findAll(userId);

  console.log("Email database sync:",{
    provider,
    direction,
    synced:sourceEmails.length,
    created:newEmails.length,
    updated:sourceEmails.length-newEmails.length,
    newestStored:storedEmails
      .filter((email)=>email.provider===provider&&email.direction===direction)
      .slice(0,5)
      .map((email)=>({
        messageId:email.messageId,
        subject:email.subject,
        receivedAt:email.receivedAt,
      })),
  });

  return {
    provider,
    direction,
    synced:sourceEmails.length,
    created:newEmails.length,
    updated:sourceEmails.length-newEmails.length,
    failed:0,
    newEmails,
    emails:storedEmails,
  };
}

async function markSyncError(userId:string,provider:EmailProvider,error:unknown){
  const account=await connectedAccountRepository.findByProvider(userId,provider);
  if(!account)return;
  const message=error instanceof Error?error.message:"Email sync failed.";
  await connectedAccountRepository.update(account._id.toString(),{
    syncStatus:"error",
    lastError:message,
  });
  console.error("Email sync failed:",{
    provider,
    error:message,
  });
}

export async function syncGmail(userId:string):Promise<SyncResult>{
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  const account=await connectedAccountRepository.findByProvider(userId,"gmail");
  if(!account?.connected)throw new Error("Gmail is not connected.");

  await connectedAccountRepository.update(account._id.toString(),{
    syncStatus:"syncing",
    lastError:"",
  });

  try{
    const emails=await listGmailEmails(userId);
    console.log("GMAIL PROVIDER EMAILS:",{
      count:emails.length,
      newest:emails[0]?.receivedAt,
      oldest:emails[emails.length-1]?.receivedAt,
      newestSubject:emails[0]?.subject,
      ids:emails.slice(0,10).map((email)=>email.id),
    });
    const normalized=emails.map((email)=>normalizeGmailEmail(userId,email));
    return await syncProvider(userId,"gmail","inbound",normalized);
  }catch(error){
    await markSyncError(userId,"gmail",error);
    throw error;
  }
}

export async function syncOutlook(userId:string):Promise<SyncResult>{
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  const account=await connectedAccountRepository.findByProvider(userId,"outlook");
  if(!account?.connected)throw new Error("Outlook is not connected.");

  await connectedAccountRepository.update(account._id.toString(),{
    syncStatus:"syncing",
    lastError:"",
  });

  try{
    const emails=await listOutlookEmails(userId);
    console.log("OUTLOOK PROVIDER EMAILS:",{
      count:emails.length,
      newest:emails[0]?.receivedAt,
      oldest:emails[emails.length-1]?.receivedAt,
      newestSubject:emails[0]?.subject,
      ids:emails.slice(0,10).map((email)=>email.id),
    });
    const normalized=emails.map((email)=>normalizeOutlookEmail(userId,email));
    return await syncProvider(userId,"outlook","inbound",normalized);
  }catch(error){
    await markSyncError(userId,"outlook",error);
    throw error;
  }
}

export async function syncGmailSent(userId:string):Promise<SyncResult>{
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  const account=await connectedAccountRepository.findByProvider(userId,"gmail");
  if(!account?.connected)throw new Error("Gmail is not connected.");

  await connectedAccountRepository.update(account._id.toString(),{
    syncStatus:"syncing",
    lastError:"",
  });

  try{
    const emails=await listGmailSentEmails(userId);
    console.log("GMAIL SENT PROVIDER EMAILS:",{
      count:emails.length,
      newest:emails[0]?.receivedAt,
      oldest:emails[emails.length-1]?.receivedAt,
      newestSubject:emails[0]?.subject,
      ids:emails.slice(0,10).map((email)=>email.id),
    });
    const normalized=emails.map((email)=>normalizeGmailSentEmail(userId,email));
    return await syncProvider(userId,"gmail","outbound",normalized);
  }catch(error){
    await markSyncError(userId,"gmail",error);
    throw error;
  }
}

export async function syncOutlookSent(userId:string):Promise<SyncResult>{
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  const account=await connectedAccountRepository.findByProvider(userId,"outlook");
  if(!account?.connected)throw new Error("Outlook is not connected.");

  await connectedAccountRepository.update(account._id.toString(),{
    syncStatus:"syncing",
    lastError:"",
  });

  try{
    const emails=await listOutlookSentEmails(userId);
    console.log("OUTLOOK SENT PROVIDER EMAILS:",{
      count:emails.length,
      newest:emails[0]?.receivedAt,
      oldest:emails[emails.length-1]?.receivedAt,
      newestSubject:emails[0]?.subject,
      ids:emails.slice(0,10).map((email)=>email.id),
    });
    const normalized=emails.map((email)=>normalizeOutlookSentEmail(userId,email));
    return await syncProvider(userId,"outlook","outbound",normalized);
  }catch(error){
    await markSyncError(userId,"outlook",error);
    throw error;
  }
}

export async function syncInbox(userId:string,provider?:EmailProvider){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

  if(provider==="gmail")return {gmail:await syncGmail(userId)};
  if(provider==="outlook")return {outlook:await syncOutlook(userId)};

  const results:{gmail?:SyncResult;outlook?:SyncResult}={};
  const gmailAccount=await connectedAccountRepository.findByProvider(userId,"gmail");
  const outlookAccount=await connectedAccountRepository.findByProvider(userId,"outlook");

  if(gmailAccount?.connected){
    try{
      results.gmail=await syncGmail(userId);
    }catch(error){
      console.error("Gmail inbox sync failed:",error);
    }
  }

  if(outlookAccount?.connected){
    try{
      results.outlook=await syncOutlook(userId);
    }catch(error){
      console.error("Outlook inbox sync failed:",error);
    }
  }

  return results;
}

export async function syncSent(userId:string,provider?:EmailProvider){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

  if(provider==="gmail")return {gmail:await syncGmailSent(userId)};
  if(provider==="outlook")return {outlook:await syncOutlookSent(userId)};

  const results:{gmail?:SyncResult;outlook?:SyncResult}={};
  const gmailAccount=await connectedAccountRepository.findByProvider(userId,"gmail");
  const outlookAccount=await connectedAccountRepository.findByProvider(userId,"outlook");

  if(gmailAccount?.connected){
    try{
      results.gmail=await syncGmailSent(userId);
    }catch(error){
      console.error("Gmail sent sync failed:",error);
    }
  }

  if(outlookAccount?.connected){
    try{
      results.outlook=await syncOutlookSent(userId);
    }catch(error){
      console.error("Outlook sent sync failed:",error);
    }
  }

  return results;
}

export async function syncAllInboxes(userId:string){
  return syncInbox(userId);
}

export async function syncAllSent(userId:string){
  return syncSent(userId);
}

export async function syncConnectedInbox(userId:string){
  return syncInbox(userId);
}
