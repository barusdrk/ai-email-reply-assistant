import {Types} from "mongoose";
import EmailModel,{type EmailDocument} from "../models/Email.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {listEmails as listGmailEmails,type InboxEmail as GmailInboxEmail,listSentEmails as listGmailSentEmails,type SentEmail as GmailSentEmail} from "./gmail.js";
import {listEmails as listOutlookEmails,type InboxEmail as OutlookInboxEmail,listSentEmails as listOutlookSentEmails,type SentEmail as OutlookSentEmail} from "./outlook.js";
import {sendEmail as sendProviderEmail} from "./sendEmail.js";
import {notifyNewCustomerEmail} from "./notification.js";

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
}
type ProviderInboxEmail=GmailInboxEmail|OutlookInboxEmail;
type ProviderSentEmail=GmailSentEmail|OutlookSentEmail;

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
  const outlookEmail=provider==="outlook"?email as OutlookSentEmail:null;
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
    receivedAt:email.receivedAt??new Date(),
  };
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
export async function syncInbox(provider:EmailProvider,userId:string):Promise<SyncInboxResult>{
  if(!isValidObjectId(userId))throw new Error("Invalid user ID.");
  const objectId=new Types.ObjectId(userId);
  const emails:ProviderInboxEmail[]=provider==="gmail"
    ?await listGmailEmails(userId)
    :await listOutlookEmails(userId);
  if(emails.length===0)return {emails:[],newEmails:[]};

  const messageIds=emails.map((item)=>item.id);
  const existing=await EmailModel.find({
    userId:objectId,
    provider,
    direction:"inbound",
    messageId:{$in:messageIds},
  }).select("messageId").lean();

  const existingMessageIds=new Set(existing.map((item)=>item.messageId));
  const newEmails=emails.filter((item)=>!existingMessageIds.has(item.id));

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

  await EmailModel.bulkWrite(operations,{ordered:false});

  const storedEmails=await EmailModel.find({
    userId:objectId,
    provider,
    direction:"inbound",
    messageId:{$in:messageIds},
  }).sort({receivedAt:-1}).lean();

  const storedByMessageId=new Map(
    storedEmails.map((stored)=>[stored.messageId,stored]),
  );

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
    await Promise.all(
      notifications.map((item)=>notifyNewCustomerEmail(userId,item)),
    );
  }

  return {
    emails:storedEmails as EmailDocument[],
    newEmails:notifications,
  };
}
export async function syncSent(provider:EmailProvider,userId:string){
  if(!isValidObjectId(userId))throw new Error("Invalid user ID.");
  const objectId=new Types.ObjectId(userId);
  const emails:ProviderSentEmail[]=provider==="gmail"
    ?await listGmailSentEmails(userId)
    :await listOutlookSentEmails(userId);
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
  await EmailModel.bulkWrite(operations,{ordered:false});
  return EmailModel.find({
    userId:objectId,
    provider,
    direction:"outbound",
    messageId:{$in:emails.map((item)=>item.id)},
  }).sort({receivedAt:-1}).lean();
}
export async function syncAllInboxes(userId:string){
  if(!isValidObjectId(userId))throw new Error("Invalid user ID.");
  const [gmailResult,outlookResult]=await Promise.allSettled([
    syncInbox("gmail",userId),
    syncInbox("outlook",userId),
  ]);
  const gmail=gmailResult.status==="fulfilled"?gmailResult.value:{emails:[],newEmails:[]};
  const outlook=outlookResult.status==="fulfilled"?outlookResult.value:{emails:[],newEmails:[]};
  const errors=[gmailResult,outlookResult]
    .filter((result):result is PromiseRejectedResult=>result.status==="rejected")
    .map((result)=>result.reason instanceof Error?result.reason.message:"Inbox sync failed.");
  return {gmail,outlook,errors};
}
export async function syncAllSent(userId:string){
  if(!isValidObjectId(userId))throw new Error("Invalid user ID.");
  const [gmailResult,outlookResult]=await Promise.allSettled([
    syncSent("gmail",userId),
    syncSent("outlook",userId),
  ]);
  const gmail=gmailResult.status==="fulfilled"?gmailResult.value:[];
  const outlook=outlookResult.status==="fulfilled"?outlookResult.value:[];
  const errors=[gmailResult,outlookResult]
    .filter((result):result is PromiseRejectedResult=>result.status==="rejected")
    .map((result)=>result.reason instanceof Error?result.reason.message:"Sent email sync failed.");
  return {gmail,outlook,errors};
}
export async function sendEmail(userId:string,input:SendEmailInput){
  if(!isValidObjectId(userId))throw new Error("Invalid user ID.");
  const to=input.to.trim();
  const subject=input.subject.trim();
  const body=input.body.trim();
  if(!to||!subject||!body)throw new Error("Recipient, subject, and body are required.");
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
