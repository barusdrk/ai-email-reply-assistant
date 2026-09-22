import API from "./api.js";
import type {ReplyTone} from "../types/settings.js";
import type {ReplyLengthValue} from "../components/LengthSelector.js";

export type EmailProvider="gmail"|"outlook";
export type SendEmailProvider=EmailProvider;

export interface ApiEmail{
  _id?:string;
  id?:string;
  provider:EmailProvider;
  direction?:"inbound"|"outbound";
  threadId?:string;
  messageId?:string;
  messageIdHeader?:string;
  references?:string[];
  subject?:string;
  from?:string;
  senderName?:string;
  senderEmail?:string;
  recipientName?:string;
  recipientEmail?:string;
  preview?:string;
  body?:string;
  receivedAt?:string|Date;
  createdAt?:string|Date;
  unread?:boolean;
  archived?:boolean;
}

export interface InboxResponse{
  emails:ApiEmail[];
  total:number;
  page:number;
  limit:number;
  hasMore:boolean;
}

export interface EmailResponse{
  email:ApiEmail;
}

export interface NewEmailNotification{
  id:string;
  senderName?:string;
  senderEmail?:string;
  subject?:string;
  preview?:string;
  referenceId?:string;
}

export interface SyncInboxResponse{
  emails:ApiEmail[];
  newEmails:NewEmailNotification[];
}

export interface GenerateReplyInput{
  email:string;
  tone?:ReplyTone;
  length?:ReplyLengthValue;
}

export interface GenerateReplyResponse{
  reply:string;
}

export interface SendEmailInput{
  provider:SendEmailProvider;
  to:string;
  subject:string;
  body:string;
  emailId:string;
  threadId?:string;
  inReplyTo?:string;
  references?:string[];
  originalMessageId?:string;
  originalMessageIdHeader?:string;
}

export interface SendEmailResponse{
  provider:"gmail"|"outlook";
  id?:string;
  messageId?:string;
  threadId?:string;
  sent:boolean;
  policyCheck?:{
    compliant:boolean;
    score:number;
    violations:string[];
    warnings:string[];
    suggestions:string[];
  };
}

export async function getInbox(page=1,limit=50):Promise<InboxResponse>{
  const {data}=await API.get<InboxResponse>("/email",{params:{page,limit}});
  return data;
}

export async function getEmail(id:string):Promise<ApiEmail>{
  const {data}=await API.get<EmailResponse>(`/email/${id}`);
  return data.email;
}

export async function syncInbox(provider?:EmailProvider):Promise<SyncInboxResponse>{
  const {data}=await API.post<SyncInboxResponse>("/email/sync",provider?{provider}:{});
  return data;
}

export async function generateReply(input:GenerateReplyInput):Promise<GenerateReplyResponse>{
  const {data}=await API.post<GenerateReplyResponse>("/reply",input);
  return data;
}

export async function sendEmail(input:SendEmailInput):Promise<SendEmailResponse>{
  const {data}=await API.post<SendEmailResponse>("/email/send",input);
  return data;
}
