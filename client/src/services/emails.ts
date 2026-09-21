import API from "./api.js";
import type {ReplyTone} from "../types/settings.js";
import type {ReplyLengthValue} from "../components/LengthSelector.js";

export type EmailProvider="gmail"|"outlook";
export type SendEmailProvider=EmailProvider;

export interface ApiEmail{
  _id?:string;
  id?:string;
  provider:EmailProvider;
  threadId?:string;
  subject?:string;
  from?:string;
  senderName?:string;
  senderEmail?:string;
  preview?:string;
  body?:string;
  receivedAt?:string|Date;
  createdAt?:string|Date;
  unread?:boolean;
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

export async function syncInbox(provider?:EmailProvider):Promise<unknown>{
  const {data}=await API.post("/email/sync",provider?{provider}:{});
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
