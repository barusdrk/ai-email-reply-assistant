import {Types} from "mongoose";
import EmailModel,{type EmailDocument} from "../models/Email.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {listEmails as listGmailEmails,type InboxEmail as GmailInboxEmail,listSentEmails as listGmailSentEmails,type SentEmail as GmailSentEmail} from "./gmail.js";
import {listEmails as listOutlookEmails,type InboxEmail as OutlookInboxEmail,listSentEmails as listOutlookSentEmails,type SentEmail as OutlookSentEmail} from "./outlook.js";
import {sendEmail as sendProviderEmail} from "./sendEmail.js";
import {notifyNewCustomerEmail} from "./notification.js";
import {processNewInboundEmail} from "./supportProcessor.js";

export type EmailProvider="gmail"|"outlook";
export interface InboxOptions{page?:number;limit?:number;}
export interface SentOptions{page?:number;limit?:number;}
export interface SendEmailInput{
  provider:EmailProvider;
  to:string;
  subject:string;
  body:string;
  threadId?:string;
  inReplyTo?:string;
  references?:string[];
  originalMessageId?:string;
  originalMessageIdHeader?:string;
}
export interface NewCustomerEmailNotification{
  id:string;
  senderName?:string;
  senderEmail?:string;
  subject?:string;
  preview?:string;
  referenceId?:string;
}
export interface SyncInboxResult{
  emails:EmailDocument[];
  newEmails:NewCustomerEmailNotification[];
  processedCount:number;
  failedCount:number;
}
type ProviderInboxEmail=GmailInboxEmail|OutlookInboxEmail;
type ProviderSentEmail=GmailSentEmail|OutlookSentEmail;

interface SupportProcessingFailure{
  message:string;
  retryable:boolean;
  reason:string;
  status?:number;
  code?:string;
}

function isValidObjectId(id:string):boolean{
  return Types.ObjectId.isValid(id);
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

function toStoredEmail(email:ProviderInboxEmail,userId:Types.ObjectId,provider:EmailProvider):Partial<EmailDocument>{
  const gmailEmail=provider==="gmail"?email as GmailInboxEmail:null;
  const from=email.from??"";
  const senderEmail=gmailEmail?.senderEmail??extractEmailAddress(from);
  const senderName=gmailEmail?.senderName??extractDisplayName(from,senderEmail);

  return {
    userId,
    provider,
    direction:"inbound",
    messageId:email.id,
    messageIdHeader:gmailEmail?.messageIdHeader??"",
    references:gmailEmail?.references??[],
    threadId:email.threadId||"",
    subject:email.subject??"",
    from,
    senderName,
    senderEmail,
    recipientName:"",
    recipientEmail:"",
    preview:email.preview??"",
    body:email.body??"",
    unread:email.unread??false,
    archived:email.archived??false,
    receivedAt:email.receivedAt??new Date(),
  };
}

function toStoredSentEmail(email:ProviderSentEmail,userId:Types.ObjectId,provider:EmailProvider):Partial<EmailDocument>{
  const gmailEmail=provider==="gmail"?email as GmailSentEmail:null;
  const from=email.from??"";
  const senderEmail=gmailEmail?.senderEmail??extractEmailAddress(from);
  const senderName=gmailEmail?.senderName??extractDisplayName(from,senderEmail);
  const recipientEmail=email.recipientEmail??extractEmailAddress(email.to??"");
  const recipientName=email.recipientName??extractDisplayName(email.to??"",recipientEmail);

  return {
    userId,
    provider,
    direction:"outbound",
    messageId:email.id,
    messageIdHeader:gmailEmail?.messageIdHeader??"",
    references:gmailEmail?.references??[],
    threadId:email.threadId||"",
    subject:email.subject??"",
    from,
    senderName,
    senderEmail,
    recipientName,
    recipientEmail,
    preview:email.preview??"",
    body:email.body??"",
    unread:false,
    archived:false,
    supportProcessingStatus:"completed",
    supportProcessingError:"",
    supportProcessingStartedAt:null,
    supportProcessedAt:null,
    receivedAt:email.receivedAt??new Date(),
  };
}

function getSupportProcessingFailure(error:unknown):SupportProcessingFailure{
  if(error&&typeof error==="object"){
    const value=(error as {
      supportProcessingError?:{
        message?:unknown;
        retryable?:unknown;
        reason?:unknown;
        status?:unknown;
        code?:unknown;
      };
    }).supportProcessingError;

    if(value){
      return {
        message:typeof value.message==="string"
          ?value.message
          :"Support processing failed.",
        retryable:value.retryable===true,
        reason:typeof value.reason==="string"
          ?value.reason
          :"unknown",
        status:typeof value.status==="number"
          ?value.status
          :undefined,
        code:typeof value.code==="string"
          ?value.code
          :undefined,
      };
    }
  }

  const message=error instanceof Error
    ?error.message
    :"Support processing failed.";

  return {
    message,
    retryable:false,
    reason:"unknown",
  };
}

async function markSupportProcessingStarted(
  userId:string,
  emailId:string,
){
  const now=new Date();

  const updated=await EmailModel.findOneAndUpdate(
    {
      _id:new Types.ObjectId(emailId),
      userId:new Types.ObjectId(userId),
      direction:"inbound",
    },
    {
      $set:{
        supportProcessingStatus:"processing",
        supportProcessingError:"",
        supportProcessingStartedAt:now,
      },
      $inc:{
        supportProcessingAttempts:1,
      },
    },
    {new:true},
  );

  if(!updated)throw new Error("Inbound email not found.");
  return updated;
}

async function markSupportProcessingCompleted(
  userId:string,
  emailId:string,
){
  const now=new Date();

  await EmailModel.updateOne(
    {
      _id:new Types.ObjectId(emailId),
      userId:new Types.ObjectId(userId),
      direction:"inbound",
    },
    {
      $set:{
        supportProcessingStatus:"completed",
        supportProcessingError:"",
        supportProcessedAt:now,
      },
      $unset:{
        supportProcessingStartedAt:1,
      },
    },
  );
}

async function markSupportProcessingFailed(
  userId:string,
  emailId:string,
  failure:SupportProcessingFailure,
){
  await EmailModel.updateOne(
    {
      _id:new Types.ObjectId(emailId),
      userId:new Types.ObjectId(userId),
      direction:"inbound",
    },
    {
      $set:{
        supportProcessingStatus:"failed",
        supportProcessingError:failure.message,
      },
      $unset:{
        supportProcessingStartedAt:1,
        supportProcessedAt:1,
      },
    },
  );
}

export async function inbox(userId:string,options:InboxOptions={}){
  if(!isValidObjectId(userId))throw new Error("Invalid user ID.");
  const page=Math.max(1,Number(options.page??1));
  const limit=Math.min(100,Math.max(1,Number(options.limit??50)));
  return emailRepository.findPage(userId,page,limit);
}

export async function sent(userId:string,options:SentOptions={}){
  if(!isValidObjectId(userId))throw new Error("Invalid user ID.");
  const page=Math.max(1,Number(options.page??1));
  const limit=Math.min(100,Math.max(1,Number(options.limit??50)));
  return emailRepository.findSentPage(userId,page,limit);
}

export async function email(id:string,userId:string){
  if(!isValidObjectId(id)||!isValidObjectId(userId))return null;

  return EmailModel.findOne({
    _id:new Types.ObjectId(id),
    userId:new Types.ObjectId(userId),
  }).lean();
}

export async function syncInbox(
  provider:EmailProvider,
  userId:string,
):Promise<SyncInboxResult>{
  if(!isValidObjectId(userId))throw new Error("Invalid user ID.");

  const objectId=new Types.ObjectId(userId);

  console.log("EMAIL SYNC START:",{provider,userId});

  let emails:ProviderInboxEmail[];

  try{
    emails=provider==="gmail"
      ?await listGmailEmails(userId)
      :await listOutlookEmails(userId);
  }catch(error){
    console.error("EMAIL PROVIDER FETCH FAILED:",{
      provider,
      error:error instanceof Error?error.message:error,
    });
    throw error;
  }

  console.log("EMAIL PROVIDER FETCH RESULT:",{
    provider,
    count:emails.length,
    newest:emails[0]?{
      id:emails[0].id,
      subject:emails[0].subject,
      receivedAt:emails[0].receivedAt,
      threadId:emails[0].threadId,
    }:null,
    oldest:emails.length>0?{
      id:emails[emails.length-1].id,
      subject:emails[emails.length-1].subject,
      receivedAt:emails[emails.length-1].receivedAt,
      threadId:emails[emails.length-1].threadId,
    }:null,
    firstIds:emails.slice(0,10).map((item)=>item.id),
  });

  if(emails.length===0){
    console.log("EMAIL SYNC EMPTY:",{provider});
    return {
      emails:[],
      newEmails:[],
      processedCount:0,
      failedCount:0,
    };
  }

  const messageIds=emails.map((item)=>item.id);

  const existing=await EmailModel.find({
    userId:objectId,
    provider,
    direction:"inbound",
    messageId:{$in:messageIds},
  }).select("messageId supportProcessingStatus").lean();

  const existingMessageIds=new Set(
    existing.map((item)=>item.messageId),
  );

  const newEmails=emails.filter(
    (item)=>!existingMessageIds.has(item.id),
  );

  console.log("EMAIL SYNC DATABASE CHECK:",{
    provider,
    providerCount:emails.length,
    existingCount:existing.length,
    newCount:newEmails.length,
    newIds:newEmails.slice(0,10).map((item)=>item.id),
  });

  const operations:Parameters<typeof EmailModel.bulkWrite>[0]=emails.map((item)=>{
    const data=toStoredEmail(item,objectId,provider);

    return {
      updateOne:{
        filter:{
          userId:objectId,
          provider,
          direction:"inbound",
          messageId:item.id,
        },
        update:{$set:data},
        upsert:true,
      },
    };
  });

  try{
    const bulkResult=await EmailModel.bulkWrite(
      operations,
      {ordered:false},
    );

    console.log("EMAIL SYNC BULK WRITE:",{
      provider,
      matched:bulkResult.matchedCount,
      modified:bulkResult.modifiedCount,
      upserted:bulkResult.upsertedCount,
    });
  }catch(error){
    console.error("EMAIL SYNC BULK WRITE FAILED:",{
      provider,
      error:error instanceof Error?error.message:error,
    });
    throw error;
  }

  const storedEmails=await EmailModel.find({
    userId:objectId,
    provider,
    direction:"inbound",
    messageId:{$in:messageIds},
  })
    .sort({receivedAt:-1})
    .lean();

  console.log("EMAIL SYNC DATABASE RESULT:",{
    provider,
    storedCount:storedEmails.length,
    newestStored:storedEmails.slice(0,10).map((item)=>({
      id:item.messageId,
      subject:item.subject,
      receivedAt:item.receivedAt,
    })),
  });

  const storedByMessageId=new Map(
    storedEmails.map((stored)=>[stored.messageId,stored]),
  );

  const newlyStoredEmails=storedEmails.filter(
    (stored)=>newEmails.some((item)=>item.id===stored.messageId),
  );

  console.log("EMAIL SYNC NEW MESSAGES:",{
    provider,
    count:newlyStoredEmails.length,
    messages:newlyStoredEmails.map((item)=>({
      id:String(item._id),
      messageId:item.messageId,
      threadId:item.threadId,
      senderEmail:item.senderEmail,
      subject:item.subject,
    })),
  });

  const notifications:NewCustomerEmailNotification[]=newEmails.map((item)=>{
    const stored=storedByMessageId.get(item.id);

    return {
      id:item.id,
      senderName:stored?.senderName??"",
      senderEmail:stored?.senderEmail??"",
      subject:stored?.subject??"",
      preview:stored?.preview??"",
      referenceId:stored?._id?.toString(),
    };
  });

  if(notifications.length>0){
    try{
      await Promise.all(
        notifications.map((item)=>notifyNewCustomerEmail(userId,item)),
      );
    }catch(error){
      console.error("EMAIL SYNC NOTIFICATION FAILED:",{
        provider,
        error:error instanceof Error?error.message:error,
      });
    }
  }

  let processedCount=0;
  let failedCount=0;

  if(newlyStoredEmails.length>0){
    for(const email of newlyStoredEmails){
      const emailId=String(email._id);

      try{
        await markSupportProcessingStarted(
          userId,
          emailId,
        );

        await processNewInboundEmail(
          userId,
          emailId,
        );

        await markSupportProcessingCompleted(
          userId,
          emailId,
        );

        processedCount++;

        console.log("SUPPORT PROCESSOR SUCCESS:",{
          provider,
          emailId,
          messageId:email.messageId,
        });
      }catch(error){
        failedCount++;

        const failure=getSupportProcessingFailure(error);

        try{
          await markSupportProcessingFailed(
            userId,
            emailId,
            failure,
          );
        }catch(statusError){
          console.error("SUPPORT PROCESSING STATUS UPDATE FAILED:",{
            provider,
            emailId,
            messageId:email.messageId,
            error:statusError instanceof Error
              ?statusError.message
              :statusError,
          });
        }

        console.error("SUPPORT PROCESSOR FAILED:",{
          provider,
          emailId,
          messageId:email.messageId,
          retryable:failure.retryable,
          reason:failure.reason,
          status:failure.status,
          code:failure.code,
          error:failure.message,
        });
      }
    }
  }

  console.log("EMAIL SYNC COMPLETE:",{
    provider,
    providerCount:emails.length,
    created:newEmails.length,
    storedCount:storedEmails.length,
    processed:processedCount,
    failed:failedCount,
    newestStored:storedEmails[0]?{
      id:storedEmails[0].messageId,
      subject:storedEmails[0].subject,
      receivedAt:storedEmails[0].receivedAt,
    }:null,
  });

  return {
    emails:storedEmails as EmailDocument[],
    newEmails:notifications,
    processedCount,
    failedCount,
  };
}

export async function syncSent(
  provider:EmailProvider,
  userId:string,
){
  if(!isValidObjectId(userId))throw new Error("Invalid user ID.");

  const objectId=new Types.ObjectId(userId);

  console.log("SENT EMAIL SYNC START:",{provider,userId});

  const emails:ProviderSentEmail[]=provider==="gmail"
    ?await listGmailSentEmails(userId)
    :await listOutlookSentEmails(userId);

  console.log("SENT EMAIL PROVIDER FETCH RESULT:",{
    provider,
    count:emails.length,
    newest:emails[0]?{
      id:emails[0].id,
      subject:emails[0].subject,
      receivedAt:emails[0].receivedAt,
    }:null,
    firstIds:emails.slice(0,10).map((item)=>item.id),
  });

  if(emails.length===0)return [];

  const operations:Parameters<typeof EmailModel.bulkWrite>[0]=emails.map((item)=>{
    const data=toStoredSentEmail(item,objectId,provider);

    return {
      updateOne:{
        filter:{
          userId:objectId,
          provider,
          direction:"outbound",
          messageId:item.id,
        },
        update:{$set:data},
        upsert:true,
      },
    };
  });

  await EmailModel.bulkWrite(
    operations,
    {ordered:false},
  );

  const storedEmails=await EmailModel.find({
    userId:objectId,
    provider,
    direction:"outbound",
    messageId:{$in:emails.map((item)=>item.id)},
  })
    .sort({receivedAt:-1})
    .lean();

  console.log("SENT EMAIL SYNC COMPLETE:",{
    provider,
    fetched:emails.length,
    stored:storedEmails.length,
    newestStored:storedEmails[0]?{
      id:storedEmails[0].messageId,
      subject:storedEmails[0].subject,
      receivedAt:storedEmails[0].receivedAt,
    }:null,
  });

  return storedEmails;
}

const inboxSyncInProgress=new Set<string>();

export async function syncAllInboxes(userId:string){
  if(!isValidObjectId(userId))throw new Error("Invalid user ID.");

  const lockKey=`${userId}:inbox`;

  if(inboxSyncInProgress.has(lockKey)){
    console.log(
      "SYNC ALL INBOXES SKIPPED: sync already in progress.",
      {userId},
    );

    return {
      gmail:{
        emails:[],
        newEmails:[],
        processedCount:0,
        failedCount:0,
      },
      outlook:{
        emails:[],
        newEmails:[],
        processedCount:0,
        failedCount:0,
      },
      errors:["Inbox sync already in progress."],
    };
  }

  inboxSyncInProgress.add(lockKey);

  try{
    console.log("SYNC ALL INBOXES START:",{userId});

    const [gmailResult,outlookResult]=await Promise.allSettled([
      syncInbox("gmail",userId),
      syncInbox("outlook",userId),
    ]);

    const gmail=gmailResult.status==="fulfilled"
      ?gmailResult.value
      :{
        emails:[],
        newEmails:[],
        processedCount:0,
        failedCount:0,
      };

    const outlook=outlookResult.status==="fulfilled"
      ?outlookResult.value
      :{
        emails:[],
        newEmails:[],
        processedCount:0,
        failedCount:0,
      };

    const errors=[gmailResult,outlookResult]
      .filter(
        (result):result is PromiseRejectedResult=>
          result.status==="rejected",
      )
      .map((result)=>result.reason instanceof Error
        ?result.reason.message
        :"Inbox sync failed.");

    if(errors.length>0){
      console.error(
        "SYNC ALL INBOXES ERRORS:",
        errors,
      );
    }

    console.log("SYNC ALL INBOXES COMPLETE:",{
      gmailEmails:gmail.emails.length,
      gmailNew:gmail.newEmails.length,
      gmailProcessed:gmail.processedCount,
      gmailFailed:gmail.failedCount,
      outlookEmails:outlook.emails.length,
      outlookNew:outlook.newEmails.length,
      outlookProcessed:outlook.processedCount,
      outlookFailed:outlook.failedCount,
      errors,
    });

    return {
      gmail,
      outlook,
      errors,
    };
  }finally{
    inboxSyncInProgress.delete(lockKey);
  }
}

export async function syncAllSent(userId:string){
  if(!isValidObjectId(userId))throw new Error("Invalid user ID.");

  const [gmailResult,outlookResult]=await Promise.allSettled([
    syncSent("gmail",userId),
    syncSent("outlook",userId),
  ]);

  const gmail=gmailResult.status==="fulfilled"
    ?gmailResult.value
    :[];

  const outlook=outlookResult.status==="fulfilled"
    ?outlookResult.value
    :[];

  const errors=[gmailResult,outlookResult]
    .filter(
      (result):result is PromiseRejectedResult=>
        result.status==="rejected",
    )
    .map((result)=>result.reason instanceof Error
      ?result.reason.message
      :"Sent email sync failed.");

  if(errors.length>0){
    console.error(
      "SYNC ALL SENT ERRORS:",
      errors,
    );
  }

  return {
    gmail,
    outlook,
    errors,
  };
}

export async function sendEmail(
  userId:string,
  input:SendEmailInput,
){
  if(!isValidObjectId(userId)){
    throw new Error("Invalid user ID.");
  }

  const to=input.to.trim();
  const subject=input.subject.trim();
  const body=input.body.trim();

  if(!to||!subject||!body){
    throw new Error(
      "Recipient, subject, and body are required.",
    );
  }

  return sendProviderEmail({
    userId,
    provider:input.provider,
    to,
    subject,
    reply:body,
    threadId:input.threadId,
    inReplyTo:input.inReplyTo,
    references:input.references,
    originalMessageId:input.originalMessageId,
    originalMessageIdHeader:input.originalMessageIdHeader,
  });
}
