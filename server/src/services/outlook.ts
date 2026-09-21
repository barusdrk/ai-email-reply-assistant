import {Types} from "mongoose";
import jwt from "jsonwebtoken";
import {env} from "../config/env.js";
import {connectedAccountRepository} from "../repositories/ConnectedAccountRepository.js";

const MICROSOFT_SCOPES=[
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "Mail.Read",
  "Mail.Send",
];

const MICROSOFT_TOKEN_URL=`https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;
const MICROSOFT_GRAPH_URL="https://graph.microsoft.com/v1.0";
const OAUTH_STATE_EXPIRES_IN="10m";

interface OAuthState{
  userId:string;
  provider:"outlook";
}

interface MicrosoftTokenResponse{
  access_token?:string;
  refresh_token?:string;
  expires_in?:number;
}

export interface InboxEmail{
  id:string;
  threadId:string;
  subject:string;
  from:string;
  preview:string;
  body:string;
  unread:boolean;
  archived:boolean;
  receivedAt?:Date;
}

export interface SentEmail{
  id:string;
  threadId:string;
  subject:string;
  from:string;
  to:string;
  recipientName:string;
  recipientEmail:string;
  preview:string;
  body:string;
  receivedAt?:Date;
}

interface MicrosoftGraphMessage{
  id?:string;
  conversationId?:string;
  subject?:string;
  bodyPreview?:string;
  receivedDateTime?:string;
  isRead?:boolean;
  from?:{
    emailAddress?:{
      address?:string;
      name?:string;
    };
  };
  toRecipients?:Array<{
    emailAddress?:{
      address?:string;
      name?:string;
    };
  }>;
  body?:{
    content?:string;
    contentType?:string;
  };
}

interface MicrosoftGraphMessageResponse{
  value?:MicrosoftGraphMessage[];
  "@odata.nextLink"?:string;
}

function createOAuthState(userId:string):string{
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  return jwt.sign(
    {userId,provider:"outlook"} satisfies OAuthState,
    env.JWT_SECRET,
    {expiresIn:OAUTH_STATE_EXPIRES_IN}
  );
}

function verifyOAuthState(state:string):string{
  try{
    const payload=jwt.verify(state,env.JWT_SECRET) as OAuthState;
    if(payload.provider!=="outlook"||!Types.ObjectId.isValid(payload.userId))throw new Error("Invalid OAuth state.");
    return payload.userId;
  }catch{
    throw new Error("Invalid or expired Microsoft OAuth state.");
  }
}

export function getMicrosoftAuthUrl(userId:string):string{
  if(!env.MICROSOFT_CLIENT_ID||!env.MICROSOFT_CALLBACK_URI)throw new Error("Microsoft OAuth is not configured.");
  const state=createOAuthState(userId);
  const params=new URLSearchParams({
    client_id:env.MICROSOFT_CLIENT_ID,
    response_type:"code",
    redirect_uri:env.MICROSOFT_CALLBACK_URI,
    response_mode:"query",
    scope:MICROSOFT_SCOPES.join(" "),
    state,
  });
  return `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeMicrosoftCode(code:string,state:string){
  if(!env.MICROSOFT_CLIENT_ID||!env.MICROSOFT_CLIENT_SECRET||!env.MICROSOFT_CALLBACK_URI)throw new Error("Microsoft OAuth is not configured.");

  const userId=verifyOAuthState(state);
  const body=new URLSearchParams({
    client_id:env.MICROSOFT_CLIENT_ID,
    client_secret:env.MICROSOFT_CLIENT_SECRET,
    code,
    redirect_uri:env.MICROSOFT_CALLBACK_URI,
    grant_type:"authorization_code",
    scope:MICROSOFT_SCOPES.join(" "),
  });

  const response=await fetch(MICROSOFT_TOKEN_URL,{
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body,
  });

  if(!response.ok){
    const text=await response.text();
    throw new Error(`Microsoft OAuth token exchange failed: ${response.status} ${text}`);
  }

  const tokens=await response.json() as MicrosoftTokenResponse;
  if(!tokens.access_token)throw new Error("Microsoft OAuth did not return an access token.");

  const userResponse=await fetch(`${MICROSOFT_GRAPH_URL}/me`,{
    headers:{Authorization:`Bearer ${tokens.access_token}`},
  });

  if(!userResponse.ok){
    const text=await userResponse.text();
    throw new Error(`Microsoft Graph profile request failed: ${userResponse.status} ${text}`);
  }

  const profile=await userResponse.json() as {mail?:string;userPrincipalName?:string};
  const email=profile.mail??profile.userPrincipalName??"";
  if(!email)throw new Error("Unable to determine Microsoft account email.");

  await connectedAccountRepository.upsert({
    userId:new Types.ObjectId(userId),
    provider:"outlook",
    email,
    connected:true,
    accessToken:tokens.access_token,
    refreshToken:tokens.refresh_token??null,
    expiresAt:tokens.expires_in?new Date(Date.now()+tokens.expires_in*1000):undefined,
    syncStatus:"idle",
    lastError:"",
  });

  return {userId,email};
}

async function refreshAccessToken(userId:string):Promise<string>{
  const account=await connectedAccountRepository.findByProvider(userId,"outlook");
  if(!account)throw new Error("Outlook account is not connected.");
  if(!account.refreshToken)throw new Error("Outlook refresh token is unavailable. Please reconnect your Outlook account.");
  if(!env.MICROSOFT_CLIENT_ID||!env.MICROSOFT_CLIENT_SECRET)throw new Error("Microsoft OAuth is not configured.");

  const body=new URLSearchParams({
    client_id:env.MICROSOFT_CLIENT_ID,
    client_secret:env.MICROSOFT_CLIENT_SECRET,
    refresh_token:account.refreshToken,
    grant_type:"refresh_token",
    scope:MICROSOFT_SCOPES.join(" "),
  });

  const response=await fetch(MICROSOFT_TOKEN_URL,{
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body,
  });

  if(!response.ok){
    const text=await response.text();
    await connectedAccountRepository.update(account._id.toString(),{
      connected:false,
      syncStatus:"error",
      lastError:`Microsoft token refresh failed: ${response.status}`,
    });
    throw new Error(`Microsoft token refresh failed: ${response.status} ${text}`);
  }

  const tokens=await response.json() as MicrosoftTokenResponse;
  if(!tokens.access_token)throw new Error("Microsoft token refresh did not return an access token.");

  await connectedAccountRepository.update(account._id.toString(),{
    accessToken:tokens.access_token,
    refreshToken:tokens.refresh_token??account.refreshToken,
    expiresAt:tokens.expires_in?new Date(Date.now()+tokens.expires_in*1000):undefined,
    connected:true,
    syncStatus:"idle",
    lastError:"",
  });

  return tokens.access_token;
}

async function getAccessToken(userId:string,forceRefresh=false):Promise<string>{
  const account=await connectedAccountRepository.findByProvider(userId,"outlook");
  if(!account?.connected)throw new Error("Outlook is not connected.");
  if(forceRefresh)return refreshAccessToken(userId);

  const expiresAt=account.expiresAt?.getTime()??0;
  const refreshBuffer=60*1000;
  if(!account.accessToken||expiresAt<=Date.now()+refreshBuffer)return refreshAccessToken(userId);

  return account.accessToken;
}

export async function outlookStatus(userId:string){
  const account=await connectedAccountRepository.findByProvider(userId,"outlook");
  return {
    connected:Boolean(account?.connected),
    email:account?.email??null,
    expiresAt:account?.expiresAt??null,
    lastSyncAt:account?.lastSyncAt??null,
    syncStatus:account?.syncStatus??"idle",
    lastError:account?.lastError??"",
  };
}

export async function disconnectOutlook(userId:string){
  const account=await connectedAccountRepository.findByProvider(userId,"outlook");
  if(account)await connectedAccountRepository.remove(userId,"outlook");
  return {success:true,outlook:false};
}

async function handleGraphError(userId:string,response:Response,operation:string):Promise<never>{
  const text=await response.text();
  const account=await connectedAccountRepository.findByProvider(userId,"outlook");

  if(account){
    await connectedAccountRepository.update(account._id.toString(),{
      syncStatus:"error",
      lastError:`Microsoft Graph ${operation} failed: ${response.status}`,
    });
  }

  throw new Error(`Microsoft Graph ${operation} failed: ${response.status} ${text}`);
}

export async function replyToEmail(userId:string,messageId:string,reply:string){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  if(!messageId.trim()||!reply.trim())throw new Error("Message ID and reply are required.");

  let accessToken=await getAccessToken(userId);
  const url=`${MICROSOFT_GRAPH_URL}/me/messages/${encodeURIComponent(messageId)}/reply`;
  const body=JSON.stringify({
    message:{
      body:{
        contentType:"Text",
        content:reply.trim(),
      },
    },
  });

  let response=await fetch(url,{
    method:"POST",
    headers:{
      Authorization:`Bearer ${accessToken}`,
      "Content-Type":"application/json",
    },
    body,
  });

  if(response.status===401){
    accessToken=await getAccessToken(userId,true);
    response=await fetch(url,{
      method:"POST",
      headers:{
        Authorization:`Bearer ${accessToken}`,
        "Content-Type":"application/json",
      },
      body,
    });
  }

  if(!response.ok)await handleGraphError(userId,response,"reply");

  return {sent:true,id:messageId};
}

export async function sendEmail(
  userId:string,
  options:{
    to:string;
    subject:string;
    reply:string;
    threadId?:string;
    originalMessageId?:string;
  }
){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  if(!options.to.trim()||!options.subject.trim()||!options.reply.trim())throw new Error("Recipient, subject, and reply are required.");

  if(options.originalMessageId?.trim()){
    return replyToEmail(userId,options.originalMessageId.trim(),options.reply);
  }

  let accessToken=await getAccessToken(userId);
  const subject=options.subject.startsWith("Re:")?options.subject:`Re: ${options.subject}`;

  const body=JSON.stringify({
    message:{
      subject,
      body:{
        contentType:"Text",
        content:options.reply.trim(),
      },
      toRecipients:[
        {
          emailAddress:{
            address:options.to.trim(),
          },
        },
      ],
    },
    saveToSentItems:true,
  });

  const url=`${MICROSOFT_GRAPH_URL}/me/sendMail`;

  let response=await fetch(url,{
    method:"POST",
    headers:{
      Authorization:`Bearer ${accessToken}`,
      "Content-Type":"application/json",
    },
    body,
  });

  if(response.status===401){
    accessToken=await getAccessToken(userId,true);
    response=await fetch(url,{
      method:"POST",
      headers:{
        Authorization:`Bearer ${accessToken}`,
        "Content-Type":"application/json",
      },
      body,
    });
  }

  if(!response.ok)await handleGraphError(userId,response,"send");

  return {
    sent:true,
  };
}

export async function listEmails(userId:string):Promise<InboxEmail[]>{
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

  let accessToken=await getAccessToken(userId);
  const params=new URLSearchParams({
    $top:"50",
    $orderby:"receivedDateTime desc",
    $select:"id,conversationId,subject,from,bodyPreview,body,receivedDateTime,isRead",
  });

  const url=`${MICROSOFT_GRAPH_URL}/me/mailFolders/inbox/messages?${params.toString()}`;
  let response=await fetch(url,{
    headers:{
      Authorization:`Bearer ${accessToken}`,
      "Content-Type":"application/json",
    },
  });

  if(response.status===401){
    accessToken=await getAccessToken(userId,true);
    response=await fetch(url,{
      headers:{
        Authorization:`Bearer ${accessToken}`,
        "Content-Type":"application/json",
      },
    });
  }

  if(!response.ok){
    const text=await response.text();
    throw new Error(`Microsoft Graph inbox request failed: ${response.status} ${text}`);
  }

  const data=await response.json() as MicrosoftGraphMessageResponse;

  return (data.value??[])
    .filter((message)=>Boolean(message.id))
    .map((message)=>({
      id:message.id??"",
      threadId:message.conversationId??message.id??"",
      subject:message.subject??"",
      from:message.from?.emailAddress?.address
        ? message.from.emailAddress.name
          ? `${message.from.emailAddress.name} <${message.from.emailAddress.address}>`
          : message.from.emailAddress.address
        : message.from?.emailAddress?.name??"",
      preview:message.bodyPreview??"",
      body:message.body?.content??message.bodyPreview??"",
      unread:!(message.isRead??false),
      archived:false,
      receivedAt:message.receivedDateTime?new Date(message.receivedDateTime):undefined,
    }));
}

export async function listSentEmails(userId:string):Promise<SentEmail[]>{
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

  let accessToken=await getAccessToken(userId);
  const params=new URLSearchParams({
    $top:"50",
    $orderby:"receivedDateTime desc",
    $select:"id,conversationId,subject,from,toRecipients,bodyPreview,body,receivedDateTime",
  });

  const url=`${MICROSOFT_GRAPH_URL}/me/mailFolders/sentitems/messages?${params.toString()}`;
  let response=await fetch(url,{
    headers:{
      Authorization:`Bearer ${accessToken}`,
      "Content-Type":"application/json",
    },
  });

  if(response.status===401){
    accessToken=await getAccessToken(userId,true);
    response=await fetch(url,{
      headers:{
        Authorization:`Bearer ${accessToken}`,
        "Content-Type":"application/json",
      },
    });
  }

  if(!response.ok){
    const text=await response.text();
    throw new Error(`Microsoft Graph sent items request failed: ${response.status} ${text}`);
  }

  const data=await response.json() as MicrosoftGraphMessageResponse;

  return (data.value??[])
    .filter((message)=>Boolean(message.id))
    .map((message)=>{
      const recipient=message.toRecipients?.[0]?.emailAddress;
      const recipientEmail=recipient?.address??"";
      const recipientName=recipient?.name??"";
      const fromAddress=message.from?.emailAddress?.address??"";
      const fromName=message.from?.emailAddress?.name??"";
      const from=fromAddress
        ? fromName
          ? `${fromName} <${fromAddress}>`
          : fromAddress
        : fromName;

      return {
        id:message.id??"",
        threadId:message.conversationId??message.id??"",
        subject:message.subject??"",
        from,
        to:recipientEmail
          ? recipientName
            ? `${recipientName} <${recipientEmail}>`
            : recipientEmail
          : "",
        recipientName,
        recipientEmail,
        preview:message.bodyPreview??"",
        body:message.body?.content??message.bodyPreview??"",
        receivedAt:message.receivedDateTime?new Date(message.receivedDateTime):undefined,
      };
    });
}
