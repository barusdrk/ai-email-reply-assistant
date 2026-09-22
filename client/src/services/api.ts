import axios from "axios";
import type {DashboardStats} from "../types/dashboard.js";

const API=axios.create({
  baseURL:import.meta.env.VITE_API_URL??"http://localhost:3001/api",
  headers:{"Content-Type":"application/json"},
  withCredentials:true,
});

API.interceptors.request.use((config)=>{
  const token=localStorage.getItem("token");
  if(token){
    config.headers=config.headers??{};
    config.headers.Authorization=`Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response)=>response,
  (error)=>{
    if(error.response?.status===401){
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(error);
  },
);

export interface Email{
  _id:string;
  userId:string;
  customerId?:string|null;
  draftId?:string|null;
  provider:"gmail"|"outlook";
  direction:"inbound"|"outbound";
  messageId:string;
  messageIdHeader?:string;
  references?:string[];
  threadId?:string;
  subject:string;
  from:string;
  senderName?:string;
  senderEmail?:string;
  recipientName?:string;
  recipientEmail?:string;
  preview?:string;
  body?:string;
  unread:boolean;
  archived:boolean;
  receivedAt:string;
  createdAt?:string;
  updatedAt?:string;
}

export interface EmailsResponse{
  emails:Email[];
  total:number;
  page:number;
  limit:number;
  hasMore:boolean;
}

export interface SentEmail{
  _id:string;
  userId:string;
  provider:"gmail"|"outlook";
  direction:"outbound";
  messageId:string;
  messageIdHeader?:string;
  references?:string[];
  threadId?:string;
  subject:string;
  from:string;
  senderName?:string;
  senderEmail?:string;
  recipientName?:string;
  recipientEmail?:string;
  preview?:string;
  body?:string;
  unread:boolean;
  archived:boolean;
  receivedAt:string;
  createdAt?:string;
  updatedAt?:string;
}

export interface SentEmailsResponse{
  emails:SentEmail[];
  total:number;
  page:number;
  limit:number;
  hasMore:boolean;
}

export type KnowledgeBaseCategory=
  |"faq"
  |"product"
  |"billing"
  |"refund"
  |"cancellation"
  |"shipping"
  |"account"
  |"technical"
  |"policy"
  |"general";

export interface KnowledgeBaseArticle{
  _id:string;
  userId:string;
  title:string;
  content:string;
  category:KnowledgeBaseCategory;
  tags:string[];
  active:boolean;
  createdAt?:string;
  updatedAt?:string;
}

export interface KnowledgeBaseArticleInput{
  title:string;
  content:string;
  category:KnowledgeBaseCategory;
  tags:string[];
  active:boolean;
}

export async function getDashboardStats():Promise<DashboardStats>{
  const response=await API.get<{success:boolean;stats:DashboardStats}>("/dashboard");
  return response.data.stats;
}

export async function getEmails(page=1,limit=50):Promise<EmailsResponse>{
  const response=await API.get<{
    success:boolean;
    emails:Email[];
    total:number;
    page:number;
    limit:number;
    hasMore:boolean;
  }>("/email",{params:{page,limit}});
  return {
    emails:response.data.emails,
    total:response.data.total,
    page:response.data.page,
    limit:response.data.limit,
    hasMore:response.data.hasMore,
  };
}

export async function syncEmails(provider?:"gmail"|"outlook"){
  const response=await API.post<{
    success:boolean;
    gmail?:unknown;
    outlook?:unknown;
    errors?:string[];
  }>("/email/sync",provider?{provider}:{});
  return response.data;
}

export async function getSentEmails(page=1,limit=50):Promise<SentEmailsResponse>{
  const response=await API.get<{
    success:boolean;
    emails:SentEmail[];
    total:number;
    page:number;
    limit:number;
    hasMore:boolean;
  }>("/email/sent",{params:{page,limit}});
  return {
    emails:response.data.emails,
    total:response.data.total,
    page:response.data.page,
    limit:response.data.limit,
    hasMore:response.data.hasMore,
  };
}

export async function syncSentEmails(provider?:"gmail"|"outlook"){
  const response=await API.post<{
    success:boolean;
    gmail?:unknown;
    outlook?:unknown;
    errors?:string[];
  }>("/email/sent/sync",provider?{provider}:{});
  return response.data;
}

export async function getKnowledgeBaseArticles():Promise<KnowledgeBaseArticle[]>{
  const response=await API.get<{
    success:boolean;
    articles:KnowledgeBaseArticle[];
  }>("/knowledge-base");
  return response.data.articles;
}

export async function searchKnowledgeBase(query:string):Promise<KnowledgeBaseArticle[]>{
  const response=await API.get<{
    success:boolean;
    articles:KnowledgeBaseArticle[];
  }>("/knowledge-base/search",{params:{q:query}});
  return response.data.articles;
}

export async function createKnowledgeBaseArticle(input:KnowledgeBaseArticleInput):Promise<KnowledgeBaseArticle>{
  const response=await API.post<{
    success:boolean;
    article:KnowledgeBaseArticle;
  }>("/knowledge-base",input);
  return response.data.article;
}

export async function updateKnowledgeBaseArticle(id:string,input:KnowledgeBaseArticleInput):Promise<KnowledgeBaseArticle>{
  const response=await API.put<{
    success:boolean;
    article:KnowledgeBaseArticle;
  }>(`/knowledge-base/${id}`,input);
  return response.data.article;
}

export async function deleteKnowledgeBaseArticle(id:string):Promise<void>{
  await API.delete(`/knowledge-base/${id}`);
}

export default API;
