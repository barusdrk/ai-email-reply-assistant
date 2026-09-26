import {google} from "googleapis";
import {Types} from "mongoose";
import crypto from "crypto";
import ConnectedAccountModel from "../models/ConnectedAccount.js";
import EmailModel from "../models/Email.js";

const GMAIL_SCOPES=[
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];
const GOOGLE_TOKEN_URL="https://oauth2.googleapis.com/token";
const GMAIL_OAUTH_STATE_MAX_AGE=10*60*1000;
const MAX_SYNC_MESSAGES=100;
const GMAIL_PAGE_SIZE=50;

export interface GoogleOAuthTokens{
  access_token:string;
  refresh_token?:string;
  expiry_date?:number;
  scope?:string;
  token_type?:string;
}

export interface InboxEmail{
  id:string;
  threadId:string;
  messageIdHeader:string;
  references:string[];
  subject:string;
  from:string;
  senderName:string;
  senderEmail:string;
  preview:string;
  body:string;
  unread:boolean;
  archived:boolean;
  receivedAt?:Date;
}

export interface SentEmail{
  id:string;
  threadId:string;
  messageIdHeader:string;
  references:string[];
  subject:string;
  from:string;
  senderName:string;
  senderEmail:string;
  recipientName:string;
  recipientEmail:string;
  to:string;
  preview:string;
  body:string;
  receivedAt?:Date;
}

function getClientId():string{
  const value=process.env.GOOGLE_CLIENT_ID?.trim();
  if(!value)throw new Error("GOOGLE_CLIENT_ID is not configured.");
  return value;
}

function getClientSecret():string{
  const value=process.env.GOOGLE_CLIENT_SECRET?.trim();
  if(!value)throw new Error("GOOGLE_CLIENT_SECRET is not configured.");
  return value;
}

function getRedirectUri():string{
  const value=process.env.GOOGLE_CALLBACK_URI?.trim();
  if(!value)throw new Error("GOOGLE_CALLBACK_URI is not configured.");
  return value;
}

function createOAuthClient(){
  return new google.auth.OAuth2(getClientId(),getClientSecret(),getRedirectUri());
}

function getOAuthStateSecret():string{
  const value=process.env.GOOGLE_OAUTH_STATE_SECRET?.trim();
  if(!value)throw new Error("GOOGLE_OAUTH_STATE_SECRET is not configured.");
  return value;
}

function encodeBase64Url(value:string):string{
  return Buffer.from(value,"utf8").toString("base64url");
}

function decodeBase64Url(value:string):string{
  return Buffer.from(value,"base64url").toString("utf8");
}

function createOAuthStateSignature(payload:string):string{
  return crypto.createHmac("sha256",getOAuthStateSecret()).update(payload).digest("base64url");
}

function createGmailOAuthState(userId:string):string{
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  const payload=encodeBase64Url(JSON.stringify({
    userId,
    nonce:crypto.randomBytes(32).toString("hex"),
    issuedAt:Date.now(),
  }));
  const signature=createOAuthStateSignature(payload);
  return `${payload}.${signature}`;
}

export function verifyGmailOAuthState(state:string):string{
  if(!state?.trim())throw new Error("Missing Gmail OAuth state.");
  const parts=state.split(".");
  if(parts.length!==2)throw new Error("Invalid Gmail OAuth state.");
  const [payload,signature]=parts;
  if(!payload||!signature)throw new Error("Invalid Gmail OAuth state.");
  const expectedSignature=createOAuthStateSignature(payload);
  const providedBuffer=Buffer.from(signature,"utf8");
  const expectedBuffer=Buffer.from(expectedSignature,"utf8");
  if(providedBuffer.length!==expectedBuffer.length||!crypto.timingSafeEqual(providedBuffer,expectedBuffer)){
    throw new Error("Invalid Gmail OAuth state signature.");
  }
  let data:{userId?:string;nonce?:string;issuedAt?:number};
  try{
    data=JSON.parse(decodeBase64Url(payload));
  }catch{
    throw new Error("Invalid Gmail OAuth state payload.");
  }
  if(!data.userId||!Types.ObjectId.isValid(data.userId))throw new Error("Invalid Gmail OAuth state user.");
  if(!data.nonce||data.nonce.length<32)throw new Error("Invalid Gmail OAuth state nonce.");
  if(typeof data.issuedAt!=="number"||!Number.isFinite(data.issuedAt))throw new Error("Invalid Gmail OAuth state timestamp.");
  const age=Date.now()-data.issuedAt;
  if(age<0||age>GMAIL_OAUTH_STATE_MAX_AGE)throw new Error("Gmail OAuth state has expired. Please try connecting Gmail again.");
  return data.userId;
}

export function getGmailAuthUrl(userId:string):string{
  const oauth=createOAuthClient();
  const state=createGmailOAuthState(userId);
  console.log("Gmail OAuth configuration:",{
    clientId:process.env.GOOGLE_CLIENT_ID,
    callbackUri:process.env.GOOGLE_CALLBACK_URI,
  });
  return oauth.generateAuthUrl({
    access_type:"offline",
    prompt:"consent",
    scope:GMAIL_SCOPES,
    state,
  });
}

export async function exchangeGmailCode(code:string):Promise<GoogleOAuthTokens>{
  if(!code?.trim())throw new Error("Google authorization code is required.");
  const oauth=createOAuthClient();
  const {tokens}=await oauth.getToken(code.trim());
  if(!tokens.access_token)throw new Error("Google OAuth did not return an access token.");
  return {
    access_token:tokens.access_token,
    refresh_token:tokens.refresh_token??undefined,
    expiry_date:tokens.expiry_date??undefined,
    scope:tokens.scope??undefined,
    token_type:tokens.token_type??undefined,
  } satisfies GoogleOAuthTokens;
}

export function getGmailClientWithTokens(tokens:GoogleOAuthTokens){
  const oauth=createOAuthClient();
  oauth.setCredentials(tokens);
  return google.gmail({version:"v1",auth:oauth});
}

async function saveTokens(userId:string,tokens:GoogleOAuthTokens){
  const update:any={
    accessToken:tokens.access_token,
    expiresAt:tokens.expiry_date?new Date(tokens.expiry_date):undefined,
    connected:true,
    lastError:"",
  };
  if(tokens.refresh_token)update.refreshToken=tokens.refresh_token;
  return ConnectedAccountModel.findOneAndUpdate(
    {userId:new Types.ObjectId(userId),provider:"gmail"},
    {$set:update},
    {new:true},
  );
}

async function refreshAccessToken(userId:string,refreshToken:string):Promise<string>{
  const response=await fetch(GOOGLE_TOKEN_URL,{
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({
      client_id:getClientId(),
      client_secret:getClientSecret(),
      refresh_token:refreshToken,
      grant_type:"refresh_token",
    }),
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.access_token){
    const message=typeof data?.error_description==="string"?data.error_description:"Failed to refresh Gmail access token.";
    await ConnectedAccountModel.findOneAndUpdate(
      {userId:new Types.ObjectId(userId),provider:"gmail"},
      {$set:{connected:false,lastError:message}},
    );
    throw new Error(message);
  }
  const accessToken=String(data.access_token);
  const expiresIn=Number(data.expires_in);
  const expiresAt=Number.isFinite(expiresIn)&&expiresIn>0?new Date(Date.now()+expiresIn*1000):undefined;
  await ConnectedAccountModel.findOneAndUpdate(
    {userId:new Types.ObjectId(userId),provider:"gmail"},
    {$set:{accessToken,expiresAt,connected:true,lastError:""}},
  );
  return accessToken;
}

async function getAccessToken(userId:string,forceRefresh=false):Promise<string>{
  const account=await ConnectedAccountModel.findOne({
    userId:new Types.ObjectId(userId),
    provider:"gmail",
  });
  if(!account?.connected)throw new Error("Gmail account is not connected.");
  if(!account.accessToken)throw new Error("Gmail access token is missing.");
  const expiresAt=account.expiresAt?.getTime()??0;
  if(!forceRefresh&&expiresAt>Date.now()+60*1000)return account.accessToken;
  if(!account.refreshToken)throw new Error("Gmail refresh token is missing. Please reconnect Gmail.");
  return refreshAccessToken(userId,account.refreshToken);
}

async function getGmailClient(userId:string,forceRefresh=false){
  const accessToken=await getAccessToken(userId,forceRefresh);
  const oauth=createOAuthClient();
  oauth.setCredentials({access_token:accessToken});
  return google.gmail({version:"v1",auth:oauth});
}

function getHeader(headers:any[],name:string):string{
  const header=headers.find((item:any)=>String(item?.name??"").toLowerCase()===name.toLowerCase());
  return String(header?.value??"").trim();
}

function extractEmailAddress(value:string):string{
  const match=value.match(/<([^>]+)>/);
  if(match?.[1])return match[1].trim().toLowerCase();
  const email=value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return email?.[0]?.trim().toLowerCase()??"";
}

function extractDisplayName(value:string,email:string):string{
  const match=value.match(/^"?([^"<]+?)"?\s*<[^>]+>$/);
  if(match?.[1])return match[1].trim();
  if(email&&value.trim().toLowerCase()!==email.toLowerCase())return value.trim();
  return "";
}

function decodeBodyData(data:string):string{
  if(!data)return "";
  try{return Buffer.from(data,"base64url").toString("utf8");}catch{return "";}
}

function collectPlainTextBody(payload:any):string{
  if(!payload)return "";
  const mimeType=String(payload.mimeType??"").toLowerCase();
  const data=payload.body?.data;
  if(mimeType==="text/plain"&&data)return decodeBodyData(data);
  for(const part of payload.parts??[]){
    const result=collectPlainTextBody(part);
    if(result.trim())return result;
  }
  return "";
}

function stripHtml(value:string):string{
  return value
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/\s+/g," ")
    .trim();
}

function collectBody(payload:any):string{
  if(!payload)return "";
  const mimeType=String(payload.mimeType??"").toLowerCase();
  const data=payload.body?.data;
  if(data&&(mimeType==="text/html"||mimeType==="text/plain"))return mimeType==="text/html"?stripHtml(decodeBodyData(data)):decodeBodyData(data);
  for(const part of payload.parts??[]){
    const result=collectBody(part);
    if(result.trim())return result;
  }
  return "";
}

function getPreview(body:string,snippet?:string):string{
  const value=(body||snippet||"").replace(/\s+/g," ").trim();
  return value.length>300?`${value.slice(0,297)}...`:value;
}

export async function getGmailProfile(userId:string){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  const gmail=await getGmailClient(userId);
  const response=await gmail.users.getProfile({userId:"me"});
  return {
    email:response.data.emailAddress??"",
    messagesTotal:response.data.messagesTotal??0,
    threadsTotal:response.data.threadsTotal??0,
  };
}

export async function connectGmail(userId:string,code:string){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  const tokens=await exchangeGmailCode(code);
  const gmail=getGmailClientWithTokens(tokens);
  const profile=await gmail.users.getProfile({userId:"me"});
  const email=profile.data.emailAddress?.trim().toLowerCase()??"";
  if(!email)throw new Error("Could not determine the connected Gmail address.");
  const update:any={
    userId:new Types.ObjectId(userId),
    provider:"gmail",
    email,
    accessToken:tokens.access_token,
    refreshToken:tokens.refresh_token,
    expiresAt:tokens.expiry_date?new Date(tokens.expiry_date):undefined,
    connected:true,
    syncStatus:"idle",
    lastError:"",
  };
  return ConnectedAccountModel.findOneAndUpdate(
    {userId:new Types.ObjectId(userId),provider:"gmail"},
    {$set:update},
    {new:true,upsert:true,setDefaultsOnInsert:true},
  );
}

export async function disconnectGmail(userId:string){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  const account=await ConnectedAccountModel.findOne({
    userId:new Types.ObjectId(userId),
    provider:"gmail",
  });
  if(!account)return null;
  if(account.accessToken){
    try{
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(account.accessToken)}`,{method:"POST"});
    }catch{}
  }
  return ConnectedAccountModel.findByIdAndUpdate(account._id,{
    $set:{
      connected:false,
      accessToken:"",
      refreshToken:"",
      expiresAt:undefined,
      syncStatus:"idle",
      lastError:"",
    },
  },{new:true});
}

export async function gmailStatus(userId:string){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  const account=await ConnectedAccountModel.findOne({
    userId:new Types.ObjectId(userId),
    provider:"gmail",
  }).lean();
  return {
    connected:Boolean(account?.connected&&account?.accessToken),
    email:account?.email??"",
    expiresAt:account?.expiresAt??null,
    lastSyncAt:account?.lastSyncAt??null,
    syncStatus:account?.syncStatus??"idle",
    lastError:account?.lastError??"",
  };
}

async function listMessageIds(
  gmail:any,
  query:string,
  labelIds?:string[],
  maxMessages=MAX_SYNC_MESSAGES,
){
  const messages:any[]=[];
  let pageToken:string|undefined;
  const limit=Math.max(1,Math.min(maxMessages,MAX_SYNC_MESSAGES));

  do{
    const remaining=limit-messages.length;
    if(remaining<=0)break;

    const response=await gmail.users.messages.list({
      userId:"me",
      q:query||undefined,
      labelIds,
      maxResults:Math.min(GMAIL_PAGE_SIZE,remaining),
      ...(pageToken?{pageToken}:{}),
    });

    messages.push(...(response.data.messages??[]));
    pageToken=response.data.nextPageToken??undefined;
  }while(pageToken);

  return messages.slice(0,limit);
}

async function getMessage(gmail:any,id:string){
  const response=await gmail.users.messages.get({
    userId:"me",
    id,
    format:"full",
  });
  return response.data;
}

function normalizeGmailMessage(message:any):InboxEmail{
  const headers=message.payload?.headers??[];
  const from=getHeader(headers,"From");
  const senderEmail=extractEmailAddress(from);
  const senderName=extractDisplayName(from,senderEmail);
  const subject=getHeader(headers,"Subject");
  const messageIdHeader=getHeader(headers,"Message-ID");
  const referencesHeader=getHeader(headers,"References");
  const inReplyTo=getHeader(headers,"In-Reply-To");
  const references=[...referencesHeader.split(/\s+/).filter(Boolean)];
  if(inReplyTo&&!references.includes(inReplyTo))references.push(inReplyTo);
  const body=collectPlainTextBody(message.payload)||collectBody(message.payload);
  const labelIds=message.labelIds??[];
  return {
    id:message.id??"",
    threadId:message.threadId??"",
    messageIdHeader,
    references,
    subject,
    from,
    senderName,
    senderEmail,
    preview:getPreview(body,message.snippet),
    body,
    unread:labelIds.includes("UNREAD"),
    archived:!labelIds.includes("INBOX"),
    receivedAt:message.internalDate?new Date(Number(message.internalDate)):new Date(),
  };
}

function normalizeGmailSentMessage(message:any):SentEmail{
  const headers=message.payload?.headers??[];
  const from=getHeader(headers,"From");
  const to=getHeader(headers,"To");
  const senderEmail=extractEmailAddress(from);
  const senderName=extractDisplayName(from,senderEmail);
  const recipientEmail=extractEmailAddress(to);
  const recipientName=extractDisplayName(to,recipientEmail);
  const subject=getHeader(headers,"Subject");
  const messageIdHeader=getHeader(headers,"Message-ID");
  const referencesHeader=getHeader(headers,"References");
  const inReplyTo=getHeader(headers,"In-Reply-To");
  const references=[...referencesHeader.split(/\s+/).filter(Boolean)];
  if(inReplyTo&&!references.includes(inReplyTo))references.push(inReplyTo);
  const body=collectPlainTextBody(message.payload)||collectBody(message.payload);
  return {
    id:message.id??"",
    threadId:message.threadId??"",
    messageIdHeader,
    references,
    subject,
    from,
    senderName,
    senderEmail,
    recipientName,
    recipientEmail,
    to,
    preview:getPreview(body,message.snippet),
    body,
    receivedAt:message.internalDate?new Date(Number(message.internalDate)):new Date(),
  };
}

async function getExistingMessageIds(
  userId:string,
  provider:"gmail",
  direction:"inbound"|"outbound",
  ids:string[],
):Promise<Set<string>>{
  if(ids.length===0)return new Set();

  const existing=await EmailModel.find({
    userId:new Types.ObjectId(userId),
    provider,
    direction,
    messageId:{$in:ids},
  }).select("messageId").lean();

  return new Set(existing.map((item)=>String(item.messageId)));
}

function getIncrementalAfterDate(
  latestReceivedAt?:Date|null,
):string{
  if(!latestReceivedAt)return "";
  const seconds=Math.floor(latestReceivedAt.getTime()/1000)-60;
  return seconds>0?`after:${seconds}`:"";
}

export async function listEmails(userId:string):Promise<InboxEmail[]>{
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

  let gmail=await getGmailClient(userId);

  const loadEmails=async(client:any)=>{
    const latestStored=await EmailModel.findOne({
      userId:new Types.ObjectId(userId),
      provider:"gmail",
      direction:"inbound",
      receivedAt:{$exists:true},
    }).sort({receivedAt:-1}).select("messageId receivedAt").lean();

    const query=getIncrementalAfterDate(latestStored?.receivedAt);

    console.log("GMAIL INCREMENTAL SYNC:",{
      latestStoredMessageId:latestStored?.messageId??null,
      latestStoredReceivedAt:latestStored?.receivedAt??null,
      query,
    });

    const messageIds=await listMessageIds(
      client,
      query,
      ["INBOX"],
      MAX_SYNC_MESSAGES,
    );

    console.log("GMAIL MESSAGE IDS:",{
      count:messageIds.length,
      ids:messageIds.map((item:any)=>item.id),
    });

    const providerIds=messageIds
      .map((item:any)=>item.id)
      .filter((id:string)=>Boolean(id));

    const existingIds=await getExistingMessageIds(
      userId,
      "gmail",
      "inbound",
      providerIds,
    );

    const newMessageIds=providerIds.filter((id:string)=>!existingIds.has(id));

    console.log("GMAIL NEW MESSAGE CHECK:",{
      providerCount:providerIds.length,
      existingCount:existingIds.size,
      newCount:newMessageIds.length,
      newIds:newMessageIds,
    });

    if(newMessageIds.length===0){
      console.log("GMAIL NO NEW MESSAGES.");
      return [];
    }

    const messages=await Promise.all(
      newMessageIds.map((id:string)=>getMessage(client,id)),
    );

    const normalized=messages
      .filter(Boolean)
      .map(normalizeGmailMessage)
      .filter((email)=>Boolean(email.id));

    console.log("GMAIL FULL MESSAGE FETCH:",{
      requested:newMessageIds.length,
      received:messages.filter(Boolean).length,
      normalized:normalized.length,
    });

    return normalized;
  };

  try{
    return await loadEmails(gmail);
  }catch(error:any){
    if(error?.code===401||error?.response?.status===401){
      gmail=await getGmailClient(userId,true);
      return await loadEmails(gmail);
    }
    throw error;
  }
}

export async function listSentEmails(userId:string):Promise<SentEmail[]>{
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  let gmail=await getGmailClient(userId);

  const loadEmails=async(client:any)=>{
    const objectId=new Types.ObjectId(userId);

    const latestStored=await EmailModel.findOne({
      userId:objectId,
      provider:"gmail",
      direction:"outbound",
    }).sort({receivedAt:-1}).select("messageId receivedAt").lean();

    const query=getIncrementalAfterDate(latestStored?.receivedAt);

    console.log("GMAIL SENT INCREMENTAL SYNC:",{
      latestStoredMessageId:latestStored?.messageId??null,
      latestStoredReceivedAt:latestStored?.receivedAt??null,
      query:query||"(initial sync)",
    });

    const messageIds=await listMessageIds(
      client,
      query,
      ["SENT"],
      MAX_SYNC_MESSAGES,
    );

    console.log("GMAIL SENT MESSAGE IDS:",{
      count:messageIds.length,
      ids:messageIds.slice(0,10).map((item:any)=>item.id),
    });

    if(messageIds.length===0)return [];

    const ids=messageIds
      .map((item:any)=>String(item.id??""))
      .filter(Boolean);

    const existingIds=await getExistingMessageIds(
      userId,
      "gmail",
      "outbound",
      ids,
    );

    const newMessageIds=messageIds.filter(
      (item:any)=>!existingIds.has(String(item.id)),
    );

    console.log("GMAIL SENT NEW MESSAGE CHECK:",{
      providerCount:messageIds.length,
      existingCount:existingIds.size,
      newCount:newMessageIds.length,
      newIds:newMessageIds.slice(0,10).map((item:any)=>item.id),
    });

    if(newMessageIds.length===0)return [];

    const messages=await Promise.all(
      newMessageIds.map((item:any)=>getMessage(client,item.id)),
    );

    const normalized=messages
      .filter(Boolean)
      .map(normalizeGmailSentMessage)
      .filter((email)=>Boolean(email.id));

    console.log("GMAIL SENT FULL MESSAGE FETCH:",{
      requested:newMessageIds.length,
      received:messages.length,
      normalized:normalized.length,
    });

    return normalized;
  };

  try{
    return await loadEmails(gmail);
  }catch(error:any){
    if(error?.code===401||error?.response?.status===401){
      gmail=await getGmailClient(userId,true);
      return await loadEmails(gmail);
    }
    throw error;
  }
}

export async function getEmail(userId:string,id:string){
  if(!Types.ObjectId.isValid(userId)||!id?.trim())return null;
  let gmail=await getGmailClient(userId);
  try{
    return normalizeGmailMessage(await getMessage(gmail,id));
  }catch(error:any){
    if(error?.code===401||error?.response?.status===401){
      gmail=await getGmailClient(userId,true);
      return normalizeGmailMessage(await getMessage(gmail,id));
    }
    throw error;
  }
}

export async function sendEmail(
  userId:string,
  options:{
    to:string;
    subject:string;
    reply:string;
    threadId?:string;
    inReplyTo?:string;
    references?:string[];
    originalMessageId?:string;
    originalMessageIdHeader?:string;
  },
):Promise<{id:string;threadId:string}>{
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  const to=options.to.trim();
  const subjectText=options.subject.trim();
  const reply=options.reply.trim();
  if(!to||!subjectText||!reply)throw new Error("Recipient, subject, and reply are required.");

  let gmail=await getGmailClient(userId);

  const subject=/^re:/i.test(subjectText)?subjectText:`Re: ${subjectText}`;

  const headers=[
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=UTF-8",
  ];

  if(options.inReplyTo?.trim()){
    headers.push(`In-Reply-To: ${options.inReplyTo.trim()}`);
  }

  if(options.references?.length){
    const references=[
      ...new Set(
        options.references
          .map((value)=>value.trim())
          .filter(Boolean),
      ),
    ];

    if(references.length){
      headers.push(`References: ${references.join(" ")}`);
    }
  }

  const message=[...headers,"",reply].join("\r\n");

  let threadId:string|undefined;

  if(options.originalMessageId?.trim()){
    try{
      const original=await gmail.users.messages.get({
        userId:"me",
        id:options.originalMessageId.trim(),
        format:"minimal",
      });

      threadId=original.data.threadId??undefined;
    }catch(error:any){
      if(error?.code===401||error?.response?.status===401){
        gmail=await getGmailClient(userId,true);

        try{
          const original=await gmail.users.messages.get({
            userId:"me",
            id:options.originalMessageId.trim(),
            format:"minimal",
          });

          threadId=original.data.threadId??undefined;
        }catch{}
      }
    }
  }

  if(!threadId&&options.originalMessageIdHeader?.trim()){
    try{
      const header=options.originalMessageIdHeader.trim();

      const result=await gmail.users.messages.list({
        userId:"me",
        q:`rfc822msgid:${header}`,
        maxResults:10,
      });

      const messageId=result.data.messages?.[0]?.id;

      if(messageId){
        const original=await gmail.users.messages.get({
          userId:"me",
          id:messageId,
          format:"minimal",
        });

        threadId=original.data.threadId??undefined;
      }
    }catch(error:any){
      if(error?.code===401||error?.response?.status===401){
        gmail=await getGmailClient(userId,true);

        try{
          const header=options.originalMessageIdHeader.trim();

          const result=await gmail.users.messages.list({
            userId:"me",
            q:`rfc822msgid:${header}`,
            maxResults:10,
          });

          const messageId=result.data.messages?.[0]?.id;

          if(messageId){
            const original=await gmail.users.messages.get({
              userId:"me",
              id:messageId,
              format:"minimal",
            });

            threadId=original.data.threadId??undefined;
          }
        }catch{}
      }
    }
  }

  if(!threadId&&options.threadId?.trim()){
    try{
      await gmail.users.threads.get({
        userId:"me",
        id:options.threadId.trim(),
        format:"minimal",
      });

      threadId=options.threadId.trim();
    }catch(error:any){
      if(error?.code===401||error?.response?.status===401){
        gmail=await getGmailClient(userId,true);

        try{
          await gmail.users.threads.get({
            userId:"me",
            id:options.threadId.trim(),
            format:"minimal",
          });

          threadId=options.threadId.trim();
        }catch{}
      }
    }
  }

  if((options.originalMessageId?.trim()||options.originalMessageIdHeader?.trim())&&!threadId){
    throw new Error("The original Gmail message could not be found in the connected Gmail account. Please sync the inbox again before sending.");
  }

  try{
    const result=await gmail.users.messages.send({
      userId:"me",
      requestBody:{
        raw:encodeBase64Url(message),
        ...(threadId?{threadId}:{}),
      },
    });

    return {
      id:result.data.id??"",
      threadId:result.data.threadId??threadId??"",
    };
  }catch(error:any){
    if(error?.code===401||error?.response?.status===401){
      gmail=await getGmailClient(userId,true);

      const result=await gmail.users.messages.send({
        userId:"me",
        requestBody:{
          raw:encodeBase64Url(message),
          ...(threadId?{threadId}:{}),
        },
      });

      return {
        id:result.data.id??"",
        threadId:result.data.threadId??threadId??"",
      };
    }

    throw error;
  }
}

export async function replyToEmail(
  userId:string,
  messageId:string,
  reply:string,
):Promise<{id:string;threadId:string}>{
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  if(!messageId?.trim())throw new Error("Gmail message ID is required.");

  const gmail=await getGmailClient(userId);

  const original=await gmail.users.messages.get({
    userId:"me",
    id:messageId.trim(),
    format:"full",
  });

  const headers=original.data.payload?.headers??[];
  const from=getHeader(headers,"From");
  const subject=getHeader(headers,"Subject");
  const originalMessageIdHeader=getHeader(headers,"Message-ID");
  const referencesHeader=getHeader(headers,"References");
  const references=[...referencesHeader.split(/\s+/).filter(Boolean)];

  if(originalMessageIdHeader&&!references.includes(originalMessageIdHeader)){
    references.push(originalMessageIdHeader);
  }

  return sendEmail(userId,{
    to:extractEmailAddress(from)||from,
    subject:/^re:/i.test(subject)?subject:`Re: ${subject}`,
    reply,
    threadId:original.data.threadId??undefined,
    inReplyTo:originalMessageIdHeader||undefined,
    references,
    originalMessageId:messageId,
    originalMessageIdHeader,
  });
}

export async function markAsRead(userId:string,messageId:string){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  if(!messageId?.trim())throw new Error("Gmail message ID is required.");

  const gmail=await getGmailClient(userId);

  await gmail.users.messages.modify({
    userId:"me",
    id:messageId.trim(),
    requestBody:{removeLabelIds:["UNREAD"]},
  });
}

export async function archiveEmail(userId:string,messageId:string){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  if(!messageId?.trim())throw new Error("Gmail message ID is required.");

  const gmail=await getGmailClient(userId);

  await gmail.users.messages.modify({
    userId:"me",
    id:messageId.trim(),
    requestBody:{removeLabelIds:["INBOX"]},
  });
}

export async function getThread(userId:string,threadId:string){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  if(!threadId?.trim())throw new Error("Gmail thread ID is required.");

  const gmail=await getGmailClient(userId);

  const response=await gmail.users.threads.get({
    userId:"me",
    id:threadId.trim(),
    format:"full",
  });

  return response.data;
}
