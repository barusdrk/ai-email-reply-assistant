import {Types} from "mongoose";
import {knowledgeBaseRepository} from "../repositories/KnowledgeBaseRepository.js";
import {buildKnowledgeBaseEmbeddingText,generateEmbedding} from "./embeddings.js";

const SEMANTIC_LIMIT=10;
const FINAL_RESULT_LIMIT=5;
const MAX_KEYWORD_TERMS=12;
const MAX_SEMANTIC_QUERY_CHARS=4000;
const STOP_WORDS=new Set(["a","about","an","and","are","can","do","for","from","how","i","in","is","it","me","my","of","on","please","the","to","what","when","where","with","you","your"]);
type KnowledgeArticle={_id:Types.ObjectId|string;title:string;content:string;category:string;tags:string[];score?:number};
type SearchEntry={article:KnowledgeArticle;semanticIndex:number;keywordIndex:number;matchedBy:Set<string>};

function truncateSearchQuery(query:string):string {
  const value=query.trim();
  return value.length<=MAX_SEMANTIC_QUERY_CHARS?value:value.slice(0,MAX_SEMANTIC_QUERY_CHARS);
}

function getArticleKey(article:KnowledgeArticle):string {
  return article._id.toString();
}

function normalizeSearchText(value:string):string {
  return value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9\s-]/g," ").replace(/\s+/g," ").trim();
}

function getQueryTerms(query:string):string[] {
  return [...new Set(normalizeSearchText(query).split(/\s+/).map((term)=>term.trim()).filter((term)=>term.length>=2&&!STOP_WORDS.has(term)))].slice(0,MAX_KEYWORD_TERMS);
}

function expandQuery(query:string):string {
  const normalized=normalizeSearchText(query);
  const terms:string[]=[query];
  const add=(value:string)=>terms.push(value);
  if(/\b(ship|shipping|deliver|delivery|arrive|arrival|order|tracking|track|package|parcel|dispatch|shipped)\b/.test(normalized)){
    add("shipping delivery order arrival estimate");
    add("when will my order arrive");
    add("how long does shipping delivery take");
    add("orders normally arrive business days");
    add("shipping timeframe delivery time");
  }
  if(/\b(refund|return|money back|reimburse)\b/.test(normalized)){
    add("refund return refund policy");
    add("how long does a refund take");
  }
  if(/\b(price|pricing|cost|plan|subscription|billing|invoice|payment)\b/.test(normalized)){
    add("pricing cost plans subscription billing payment");
  }
  if(/\b(password|login|log in|account|security|access)\b/.test(normalized)){
    add("account access login password security");
  }
  return [...new Set(terms)].join(" ");
}

function getArticleSearchFields(article:KnowledgeArticle) {
  return {
    title:normalizeSearchText(article.title),
    content:normalizeSearchText(article.content),
    category:normalizeSearchText(article.category),
    tags:(article.tags??[]).map(normalizeSearchText),
  };
}

function isShippingArticle(article:KnowledgeArticle):boolean {
  const fields=getArticleSearchFields(article);
  const text=[fields.title,fields.category,...fields.tags].join(" ");
  return /\b(ship|shipping|deliver|delivery|order|tracking|track|package|parcel|dispatch)\b/.test(text);
}

function hasShippingEstimate(article:KnowledgeArticle):boolean {
  return /3\s*[-–to]+\s*5\s+business\s+days/i.test(article.content)||/\b3\s*[-–]\s*5\s+business\s+days\b/i.test(article.content);
}


function scoreArticle(article:KnowledgeArticle,queryTerms:string[],semanticIndex:number,keywordIndex:number,query:string):number {
  const fields=getArticleSearchFields(article);
  const titleTerms=fields.title.split(/\s+/);
  const contentTerms=fields.content.split(/\s+/);
  const categoryTerms=fields.category.split(/\s+/);
  const tagTerms=fields.tags.flatMap((tag)=>tag.split(/\s+/));
  const normalizedQuery=normalizeSearchText(query);
  let score=0;
  for(const term of queryTerms){
    if(titleTerms.includes(term))score+=15;
    if(tagTerms.includes(term))score+=10;
    if(categoryTerms.includes(term))score+=8;
    if(contentTerms.includes(term))score+=2;
  }
  if(normalizedQuery&&fields.title===normalizedQuery)score+=100;
  else if(normalizedQuery&&fields.title.includes(normalizedQuery))score+=60;
  const isShippingQuery=/\b(ship|shipping|deliver|delivery|arrive|arrival|order|tracking|track|package|parcel)\b/.test(normalizedQuery);
  if(isShippingQuery&&isShippingArticle(article))score+=20;
  if(isShippingQuery&&hasShippingEstimate(article))score+=50;
  if(typeof article.score==="number")score+=Math.max(0,Math.min(article.score,1))*2;
  if(keywordIndex!==Number.MAX_SAFE_INTEGER)score+=Math.max(0,10-keywordIndex)*0.1;
  if(semanticIndex!==Number.MAX_SAFE_INTEGER)score+=Math.max(0,SEMANTIC_LIMIT-semanticIndex)*0.01;
  return score;
}


function mergeAndRankArticles(semanticArticles:KnowledgeArticle[],keywordArticles:KnowledgeArticle[],queryTerms:string[],query:string):KnowledgeArticle[] {
  const articles=new Map<string,SearchEntry>();
  semanticArticles.forEach((article,index)=>{
    articles.set(getArticleKey(article),{article,semanticIndex:index,keywordIndex:Number.MAX_SAFE_INTEGER,matchedBy:new Set(["semantic"])});
  });
  keywordArticles.forEach((article,index)=>{
    const key=getArticleKey(article);
    const existing=articles.get(key);
    if(existing){
      existing.keywordIndex=Math.min(existing.keywordIndex,index);
      existing.matchedBy.add("keyword");
    }else{
      articles.set(key,{article,semanticIndex:Number.MAX_SAFE_INTEGER,keywordIndex:index,matchedBy:new Set(["keyword"])});
    }
  });
  const normalizedQuery=normalizeSearchText(query);
  const originalTerms=getQueryTerms(query);
  const shippingQuery=/\b(ship|shipping|deliver|delivery|arrive|arrival|order|tracking|track|package|parcel)\b/.test(normalizedQuery);
  const ranked=[...articles.values()].map((entry)=>{
    const {article,semanticIndex,keywordIndex}=entry;
    const fields=getArticleSearchFields(article);
    const titleText=fields.title;
    const titleWords=titleText.split(/\s+/);
    const searchableText=[fields.title,fields.content,fields.category,...fields.tags].join(" ").split(/\s+/);
    const matchedTerms=originalTerms.filter((term)=>searchableText.includes(term)).length;
    const titleMatches=originalTerms.filter((term)=>titleWords.includes(term)).length;
    const tagMatches=originalTerms.filter((term)=>fields.tags.some((tag)=>tag.split(/\s+/).includes(term))).length;
    const exactTitleMatch=Boolean(normalizedQuery)&&titleText===normalizedQuery;
    const partialTitleMatch=Boolean(normalizedQuery)&&titleText.includes(normalizedQuery);
    const score=scoreArticle(article,originalTerms,semanticIndex,keywordIndex,query);
    return {...entry,matchedTerms,titleMatches,tagMatches,score,exactTitleMatch,partialTitleMatch,shippingMatch:shippingQuery&&isShippingArticle(article),estimateMatch:shippingQuery&&hasShippingEstimate(article)};
  });
  console.log("[KB SEARCH STAGES]",{
    query:query.slice(0,300),
    queryTerms:originalTerms,
    semanticTitles:semanticArticles.map((article)=>article.title),
    keywordTitles:keywordArticles.map((article)=>article.title),
    ranked:ranked.map((item)=>({title:item.article.title,score:item.score,matchedBy:[...item.matchedBy],exactTitleMatch:item.exactTitleMatch,partialTitleMatch:item.partialTitleMatch,shippingMatch:item.shippingMatch,estimateMatch:item.estimateMatch})),
  });
  return ranked.filter((item)=>item.matchedTerms>0||item.shippingMatch||item.estimateMatch||item.exactTitleMatch||item.partialTitleMatch)
    .sort((a,b)=>{
      if(a.exactTitleMatch!==b.exactTitleMatch)return Number(b.exactTitleMatch)-Number(a.exactTitleMatch);
      if(a.partialTitleMatch!==b.partialTitleMatch)return Number(b.partialTitleMatch)-Number(a.partialTitleMatch);
      if(a.estimateMatch!==b.estimateMatch)return Number(b.estimateMatch)-Number(a.estimateMatch);
      if(a.shippingMatch!==b.shippingMatch)return Number(b.shippingMatch)-Number(a.shippingMatch);
      if(a.titleMatches!==b.titleMatches)return b.titleMatches-a.titleMatches;
      if(a.tagMatches!==b.tagMatches)return b.tagMatches-a.tagMatches;
      if(a.matchedTerms!==b.matchedTerms)return b.matchedTerms-a.matchedTerms;
      if(a.score!==b.score)return b.score-a.score;
      if(a.keywordIndex!==b.keywordIndex)return a.keywordIndex-b.keywordIndex;
      return a.semanticIndex-b.semanticIndex;
    })
    .slice(0,FINAL_RESULT_LIMIT)
    .map(({article})=>article);
}

async function keywordSearchKnowledgeBase(userId:string,query:string):Promise<KnowledgeArticle[]> {
  const terms=getQueryTerms(query);
  if(terms.length===0){
    const articles=await knowledgeBaseRepository.search(userId,query);
    if(!articles)throw new Error("Unable to search knowledge base.");
    return articles as unknown as KnowledgeArticle[];
  }
  const results=await Promise.all(terms.map(async(term)=>{
    const articles=await knowledgeBaseRepository.search(userId,term);
    return articles??[];
  }));
  const merged=new Map<string,KnowledgeArticle>();
  results.flat().forEach((article)=>{
    const normalized=article as unknown as KnowledgeArticle;
    merged.set(getArticleKey(normalized),normalized);
  });
  return [...merged.values()];
}

export async function getKnowledgeBaseArticles(userId:string) {
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  const articles=await knowledgeBaseRepository.findAll(userId);
  if(!articles)throw new Error("Unable to load knowledge base.");
  return articles;
}

export async function getKnowledgeBaseArticle(userId:string,id:string) {
  if(!Types.ObjectId.isValid(userId)||!Types.ObjectId.isValid(id))throw new Error("Invalid user or article ID.");
  return knowledgeBaseRepository.findById(userId,id);
}

export async function searchKnowledgeBase(userId:string,query:string) {
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  const searchQuery=truncateSearchQuery(query);
  if(!searchQuery){
    const articles=await knowledgeBaseRepository.findActive(userId);
    if(!articles)throw new Error("Unable to search knowledge base.");
    return articles;
  }
  const expandedQuery=expandQuery(searchQuery);
  const queryTerms=getQueryTerms(expandedQuery);
  let semanticArticles:KnowledgeArticle[]=[];
  try{
    const embedding=await generateEmbedding(truncateSearchQuery(expandedQuery));
    const articles=await knowledgeBaseRepository.semanticSearch(userId,embedding,SEMANTIC_LIMIT);
    if(articles)semanticArticles=articles as unknown as KnowledgeArticle[];
  }catch(error){
    console.error("Knowledge base semantic search failed:",error);
  }
  let keywordArticles:KnowledgeArticle[]=[];
  try{
    keywordArticles=await keywordSearchKnowledgeBase(userId,expandedQuery);
  }catch(error){
    console.error("Knowledge base keyword search failed:",error);
  }
  console.log("[KB SEARCH INPUT]",{
    query:searchQuery,
    expandedQuery,
    semanticCount:semanticArticles.length,
    keywordCount:keywordArticles.length,
  });
  if(semanticArticles.length===0&&keywordArticles.length===0)throw new Error("Unable to search knowledge base.");
  return mergeAndRankArticles(semanticArticles,keywordArticles,getQueryTerms(searchQuery),searchQuery);
}

export async function createKnowledgeBaseArticle(userId:string,data:{title:string;content:string;category?:string;tags?:string[];active?:boolean}) {
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");
  const title=typeof data.title==="string"?data.title.trim():"";
  const content=typeof data.content==="string"?data.content.trim():"";
  if(!title)throw new Error("Article title is required.");
  if(!content)throw new Error("Article content is required.");
  const category=typeof data.category==="string"&&data.category.trim()?data.category.trim().toLowerCase():"general";
  const tags=Array.isArray(data.tags)?data.tags.map((tag)=>typeof tag==="string"?tag.trim().toLowerCase():"").filter(Boolean):[];
  const article=await knowledgeBaseRepository.create({userId,title,content,category,tags,active:data.active??true});
  void (async()=>{
    try{
      const embeddingText=buildKnowledgeBaseEmbeddingText({title:article.title,content:article.content,category:article.category,tags:article.tags});
      const embedding=await generateEmbedding(embeddingText);
      await knowledgeBaseRepository.update(userId,article._id.toString(),{embedding});
    }catch(error){
      console.error("Knowledge base embedding generation failed:",{
        articleId:article._id.toString(),
        error:error instanceof Error?error.message:error,
      });
    }
  })();
  return article;
}

export async function updateKnowledgeBaseArticle(userId:string,id:string,data:{title?:string;content?:string;category?:string;tags?:string[];active?:boolean}) {
  if(!Types.ObjectId.isValid(userId)||!Types.ObjectId.isValid(id))throw new Error("Invalid user or article ID.");
  const updateData:{title?:string;content?:string;category?:string;tags?:string[];active?:boolean}={};
  if(data.title!==undefined){
    const title=typeof data.title==="string"?data.title.trim():"";
    if(!title)throw new Error("Article title cannot be empty.");
    updateData.title=title;
  }
  if(data.content!==undefined){
    const content=typeof data.content==="string"?data.content.trim():"";
    if(!content)throw new Error("Article content cannot be empty.");
    updateData.content=content;
  }
  if(data.category!==undefined){
    const category=typeof data.category==="string"?data.category.trim().toLowerCase():"";
    if(!category)throw new Error("Article category cannot be empty.");
    updateData.category=category;
  }
  if(data.tags!==undefined){
    updateData.tags=Array.isArray(data.tags)?data.tags.map((tag)=>typeof tag==="string"?tag.trim().toLowerCase():"").filter(Boolean):[];
  }
  if(data.active!==undefined)updateData.active=data.active;
  const article=await knowledgeBaseRepository.update(userId,id,updateData);
  if(!article)return null;
  const embeddingText=buildKnowledgeBaseEmbeddingText({title:article.title,content:article.content,category:article.category,tags:article.tags});
  const embedding=await generateEmbedding(embeddingText);
  return knowledgeBaseRepository.update(userId,id,{embedding});
}

export async function deleteKnowledgeBaseArticle(userId:string,id:string) {
  if(!Types.ObjectId.isValid(userId)||!Types.ObjectId.isValid(id))throw new Error("Invalid user or article ID.");
  return knowledgeBaseRepository.delete(userId,id);
}

export async function getRelevantKnowledgeBase(userId:string,query:string) {
  return searchKnowledgeBase(userId,query);
}
