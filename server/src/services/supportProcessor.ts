import {Types} from "mongoose";
import EmailModel from "../models/Email.js";
import {createDraftFromSupportResult} from "./drafts.js";

export interface SupportConversationMessage{
  id:string;
  messageId:string;
  direction:"inbound"|"outbound";
  senderEmail:string;
  recipientEmail:string;
  subject:string;
  body:string;
  receivedAt:Date;
}

export interface SupportRequest{
  userId:string;
  emailId:string;
  provider:"gmail"|"outlook"|"sample";
  customer:{
    name:string;
    email:string;
  };
  conversation:{
    threadId:string;
    messages:SupportConversationMessage[];
  };
  latestMessage:{
    subject:string;
    body:string;
  };
  context:{
    customerId?:string;
  };
}

export interface SupportProcessingError{
  message:string;
  status?:number;
  code?:string;
  retryable:boolean;
  reason:"rate_limit"|"temporary_api_error"|"permanent_error"|"unknown";
}

function isValidObjectId(id:string):boolean{
  return Types.ObjectId.isValid(id);
}

function toConversationMessage(email:any):SupportConversationMessage{
  return {
    id:String(email._id),
    messageId:email.messageId??"",
    direction:email.direction==="outbound"?"outbound":"inbound",
    senderEmail:email.senderEmail??email.from??"",
    recipientEmail:email.recipientEmail??"",
    subject:email.subject??"",
    body:email.body??"",
    receivedAt:email.receivedAt??email.createdAt??new Date(),
  };
}

function getErrorStatus(error:unknown):number|undefined{
  if(!error||typeof error!=="object")return undefined;
  const value=(error as {status?:unknown}).status;
  return typeof value==="number"?value:undefined;
}

function getErrorCode(error:unknown):string|undefined{
  if(!error||typeof error!=="object")return undefined;
  const value=(error as {code?:unknown}).code;
  return typeof value==="string"?value:undefined;
}

function getErrorMessage(error:unknown):string{
  if(error instanceof Error)return error.message;
  if(typeof error==="string")return error;
  try{
    return JSON.stringify(error);
  }catch{
    return "Unknown support processing error.";
  }
}

function classifySupportProcessingError(
  error:unknown,
):SupportProcessingError{
  const message=getErrorMessage(error);
  const status=getErrorStatus(error);
  const code=getErrorCode(error);
  const normalizedMessage=message.toLowerCase();

  if(
    status===429||
    code==="429"||
    code==="rate_limit_exceeded"||
    normalizedMessage.includes("rate limit")||
    normalizedMessage.includes("quota exceeded")||
    normalizedMessage.includes("too many requests")
  ){
    return {
      message,
      status,
      code,
      retryable:true,
      reason:"rate_limit",
    };
  }

  if(
    status===408||
    status===425||
    status===500||
    status===502||
    status===503||
    status===504||
    normalizedMessage.includes("timeout")||
    normalizedMessage.includes("temporarily unavailable")||
    normalizedMessage.includes("service unavailable")||
    normalizedMessage.includes("internal server error")
  ){
    return {
      message,
      status,
      code,
      retryable:true,
      reason:"temporary_api_error",
    };
  }

  if(
    status===400||
    status===401||
    status===403||
    status===404
  ){
    return {
      message,
      status,
      code,
      retryable:false,
      reason:"permanent_error",
    };
  }

  return {
    message,
    status,
    code,
    retryable:false,
    reason:"unknown",
  };
}

async function buildSupportRequest(
  userId:string,
  emailId:string,
):Promise<SupportRequest>{
  if(!isValidObjectId(userId)){
    throw new Error("Invalid user ID.");
  }

  if(!isValidObjectId(emailId)){
    throw new Error("Invalid email ID.");
  }

  const email=await EmailModel.findOne({
    _id:new Types.ObjectId(emailId),
    userId:new Types.ObjectId(userId),
    direction:"inbound",
  }).lean();

  if(!email){
    throw new Error("Inbound email not found.");
  }

  const threadId=email.threadId??"";
  let conversationEmails:any[]=[];

  if(threadId){
    conversationEmails=await EmailModel.find({
      userId:new Types.ObjectId(userId),
      threadId,
    })
      .sort({receivedAt:1,createdAt:1})
      .lean();
  }else{
    conversationEmails=[email];
  }

  const messages=conversationEmails.map(toConversationMessage);

  return {
    userId,
    emailId,
    provider:email.provider,
    customer:{
      name:email.senderName??"",
      email:email.senderEmail??email.from??"",
    },
    conversation:{
      threadId,
      messages,
    },
    latestMessage:{
      subject:email.subject??"",
      body:email.body??"",
    },
    context:{
      customerId:email.customerId
        ?String(email.customerId)
        :undefined,
    },
  };
}

export async function processNewInboundEmail(
  userId:string,
  emailId:string,
){
  if(!isValidObjectId(userId)){
    throw new Error("Invalid user ID.");
  }

  if(!isValidObjectId(emailId)){
    throw new Error("Invalid email ID.");
  }

  const request=await buildSupportRequest(
    userId,
    emailId,
  );

  if(request.provider!=="gmail"&&request.provider!=="outlook"){
    throw new Error(
      `Unsupported draft provider: ${request.provider}`,
    );
  }

  try{
    const draft=await createDraftFromSupportResult({
      userId,
      emailId,
      provider:request.provider,
      subject:request.latestMessage.subject,
      customer:request.customer.email,
      tone:"professional",
      length:"medium",
    });

    console.log("SUPPORT PROCESSING COMPLETE:",{
      userId,
      emailId,
      draftId:String(draft._id),
      automaticAction:draft.automaticAction,
      status:draft.status,
      confidence:draft.confidence,
      supportDecision:draft.supportDecision,
      supportCategory:draft.supportCategory,
      supportNeedsHuman:draft.supportNeedsHuman,
    });

    return {
      request,
      draft,
      success:true,
      processingError:null,
    };
  }catch(error){
    const processingError=classifySupportProcessingError(error);

    console.error("SUPPORT PROCESSING FAILED:",{
      userId,
      emailId,
      provider:request.provider,
      success:false,
      retryable:processingError.retryable,
      reason:processingError.reason,
      status:processingError.status,
      code:processingError.code,
      message:processingError.message,
    });

    throw Object.assign(
      new Error(processingError.message),
      {
        cause:error,
        supportProcessingError:processingError,
      },
    );
  }
}
