import {Types} from "mongoose";
import ConnectedAccountModel from "../models/ConnectedAccount.js";
import UserModel from "../models/User.js";
import {sendEmail as sendGmailEmail} from "./gmail.js";
import {replyToEmail as replyToOutlookEmail,sendEmail as sendOutlookEmail} from "./outlook.js";

export type Provider="gmail"|"outlook";

export interface SendEmailOptions{
  userId:string;
  provider:Provider;
  to:string;
  subject:string;
  reply:string;
  threadId?:string;
  inReplyTo?:string;
  references?:string[];
  originalMessageId?:string;
  originalMessageIdHeader?:string;
}

async function sendOutlook(options:SendEmailOptions){
  if(options.originalMessageId){
    const result=await replyToOutlookEmail(options.userId,options.originalMessageId,options.reply);
    return{id:result.id,threadId:options.threadId??"",provider:"outlook" as const,sent:result.sent};
  }
  const result=await sendOutlookEmail(options.userId,{
    to:options.to,
    subject:options.subject,
    reply:options.reply,
    threadId:options.threadId,
  });
  return{id:"",threadId:options.threadId??"",provider:"outlook" as const,sent:result.sent};
}

async function resolveProvider(userId:string,provider:Provider):Promise<Provider>{
  if(provider==="gmail"||provider==="outlook")return provider;
  const user=await UserModel.findById(userId).select("activeEmailProvider").lean();
  const activeProvider=user?.activeEmailProvider;
  if(activeProvider!=="gmail"&&activeProvider!=="outlook")throw new Error("Select Gmail or Outlook as your active email provider.");
  const account=await ConnectedAccountModel.findOne({
    userId:new Types.ObjectId(userId),
    provider:activeProvider,
    connected:true,
  });
  if(!account?.accessToken)throw new Error(`${activeProvider==="gmail"?"Gmail":"Outlook"} account is not connected.`);
  return activeProvider;
}

export async function sendEmail(options:SendEmailOptions){
  if(!Types.ObjectId.isValid(options.userId))throw new Error("Invalid user ID.");

  const to=options.to.trim();
  const subject=options.subject.trim();
  const reply=options.reply.trim();

  if(!to||!subject||!reply)throw new Error("Recipient, subject, and reply are required.");

  const provider=await resolveProvider(options.userId,options.provider);

  const resolvedOptions:SendEmailOptions={
    ...options,
    provider,
    to,
    subject,
    reply,
    threadId:options.threadId?.trim()||undefined,
    inReplyTo:options.inReplyTo?.trim()||undefined,
    references:options.references?.filter(Boolean),
    originalMessageId:options.originalMessageId?.trim()||undefined,
    originalMessageIdHeader:options.originalMessageIdHeader?.trim()||undefined,
  };

  if(provider==="gmail"){
    const result=await sendGmailEmail(options.userId,{
      to:resolvedOptions.to,
      subject:resolvedOptions.subject,
      reply:resolvedOptions.reply,
      threadId:resolvedOptions.threadId,
      inReplyTo:resolvedOptions.inReplyTo,
      references:resolvedOptions.references,
      originalMessageId:resolvedOptions.originalMessageId,
      originalMessageIdHeader:resolvedOptions.originalMessageIdHeader,
    });

    return{
      id:result.id,
      threadId:result.threadId,
      provider:"gmail" as const,
      sent:true,
    };
  }

  return sendOutlook(resolvedOptions);
}
