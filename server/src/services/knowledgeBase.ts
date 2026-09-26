import {Types} from "mongoose";
import {knowledgeBaseRepository} from "../repositories/KnowledgeBaseRepository.js";
import {buildKnowledgeBaseEmbeddingText,generateEmbedding} from "./embeddings.js";

const SEMANTIC_LIMIT=5;
const FINAL_RESULT_LIMIT=5;
const MAX_KEYWORD_TERMS=6;
const MAX_SEMANTIC_QUERY_CHARS=24000;

const STOP_WORDS=new Set([
  "a",
  "about",
  "an",
  "and",
  "are",
  "can",
  "do",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "me",
  "my",
  "of",
  "on",
  "please",
  "the",
  "to",
  "what",
  "where",
  "with",
  "you",
  "your",
]);

type KnowledgeArticle={
  _id:Types.ObjectId|string;
  title:string;
  content:string;
  category:string;
  tags:string[];
  score?:number;
};

function truncateSearchQuery(query:string):string{
  const value=query.trim();
  if(value.length<=MAX_SEMANTIC_QUERY_CHARS)return value;
  return value.slice(0,MAX_SEMANTIC_QUERY_CHARS);
}

function getArticleKey(article:KnowledgeArticle):string{
  return article._id.toString();
}

function getQueryTerms(query:string):string[]{
  return [...new Set(
    query
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/gi," ")
      .split(/\s+/)
      .map((term)=>term.trim())
      .filter((term)=>term.length>=3&&!STOP_WORDS.has(term)),
  )].slice(0,MAX_KEYWORD_TERMS);
}

function scoreArticle(article:KnowledgeArticle,queryTerms:string[],semanticIndex:number):number{
  const title=article.title.toLowerCase();
  const content=article.content.toLowerCase();
  const category=article.category.toLowerCase();
  const tags=article.tags.map((tag)=>tag.toLowerCase());
  let score=0;

  for(const term of queryTerms){
    if(title.includes(term))score+=10;
    if(tags.some((tag)=>tag.includes(term)))score+=8;
    if(category.includes(term))score+=7;
    if(content.includes(term))score+=2;
  }

  if(typeof article.score==="number"){
    score+=Math.max(0,Math.min(article.score,1))*3;
  }

  score+=Math.max(0,SEMANTIC_LIMIT-semanticIndex)*0.01;
  return score;
}

function mergeAndRankArticles(
  semanticArticles:KnowledgeArticle[],
  keywordArticles:KnowledgeArticle[],
  queryTerms:string[],
):KnowledgeArticle[]{
  const articles=new Map<string,{article:KnowledgeArticle;semanticIndex:number}>();

  semanticArticles.forEach((article,index)=>{
    articles.set(getArticleKey(article),{
      article,
      semanticIndex:index,
    });
  });

  keywordArticles.forEach((article,index)=>{
    const key=getArticleKey(article);
    const existing=articles.get(key);

    if(existing){
      articles.set(key,{
        article:existing.article,
        semanticIndex:existing.semanticIndex,
      });
    }else{
      articles.set(key,{
        article,
        semanticIndex:SEMANTIC_LIMIT+index,
      });
    }
  });

  return [...articles.values()]
    .map(({article,semanticIndex})=>({
      article,
      score:scoreArticle(article,queryTerms,semanticIndex),
    }))
    .sort((a,b)=>b.score-a.score)
    .slice(0,FINAL_RESULT_LIMIT)
    .map(({article})=>article);
}

async function keywordSearchKnowledgeBase(userId:string,query:string):Promise<KnowledgeArticle[]>{
  const terms=getQueryTerms(query);

  if(terms.length===0){
    const articles=await knowledgeBaseRepository.search(userId,query);
    if(!articles)throw new Error("Unable to search knowledge base.");
    return articles as unknown as KnowledgeArticle[];
  }

  const results=await Promise.all(
    terms.map(async(term)=>{
      const articles=await knowledgeBaseRepository.search(userId,term);
      return articles??[];
    }),
  );

  const merged=new Map<string,KnowledgeArticle>();

  results.flat().forEach((article)=>{
    const normalized=article as unknown as KnowledgeArticle;
    merged.set(getArticleKey(normalized),normalized);
  });

  return [...merged.values()];
}

export async function getKnowledgeBaseArticles(userId:string){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

  const articles=await knowledgeBaseRepository.findAll(userId);
  if(!articles)throw new Error("Unable to load knowledge base.");

  return articles;
}

export async function getKnowledgeBaseArticle(userId:string,id:string){
  if(!Types.ObjectId.isValid(userId)||!Types.ObjectId.isValid(id)){
    throw new Error("Invalid user or article ID.");
  }

  return knowledgeBaseRepository.findById(userId,id);
}

export async function searchKnowledgeBase(userId:string,query:string){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

  const searchQuery=truncateSearchQuery(query);

  if(!searchQuery){
    const articles=await knowledgeBaseRepository.findActive(userId);
    if(!articles)throw new Error("Unable to search knowledge base.");
    return articles;
  }

  const queryTerms=getQueryTerms(searchQuery);
  let semanticArticles:KnowledgeArticle[]=[];

  try{
    const embedding=await generateEmbedding(searchQuery);
    const articles=await knowledgeBaseRepository.semanticSearch(
      userId,
      embedding,
      SEMANTIC_LIMIT,
    );

    if(articles){
      semanticArticles=articles as unknown as KnowledgeArticle[];
    }
  }catch(error){
    console.error("Knowledge base semantic search failed:",error);
  }

  let keywordArticles:KnowledgeArticle[]=[];

  try{
    keywordArticles=await keywordSearchKnowledgeBase(userId,searchQuery);
  }catch(error){
    console.error("Knowledge base keyword search failed:",error);
  }

  if(semanticArticles.length===0&&keywordArticles.length===0){
    throw new Error("Unable to search knowledge base.");
  }

  if(semanticArticles.length===0){
    return keywordArticles.slice(0,FINAL_RESULT_LIMIT);
  }

  if(keywordArticles.length===0){
    return semanticArticles.slice(0,FINAL_RESULT_LIMIT);
  }

  return mergeAndRankArticles(
    semanticArticles,
    keywordArticles,
    queryTerms,
  );
}

export async function createKnowledgeBaseArticle(
  userId:string,
  data:{
    title:string;
    content:string;
    category?:string;
    tags?:string[];
    active?:boolean;
  },
){
  if(!Types.ObjectId.isValid(userId))throw new Error("Invalid user ID.");

  const title=typeof data.title==="string"?data.title.trim():"";
  const content=typeof data.content==="string"?data.content.trim():"";

  if(!title)throw new Error("Article title is required.");
  if(!content)throw new Error("Article content is required.");

  const category=typeof data.category==="string"&&data.category.trim()
    ?data.category.trim().toLowerCase()
    :"general";

  const tags=Array.isArray(data.tags)
    ?data.tags
      .map((tag)=>typeof tag==="string"?tag.trim().toLowerCase():"")
      .filter(Boolean)
    :[];

  const active=data.active??true;

  const article=await knowledgeBaseRepository.create({
    userId,
    title,
    content,
    category,
    tags,
    active,
  });

  const embeddingText=buildKnowledgeBaseEmbeddingText({
    title:article.title,
    content:article.content,
    category:article.category,
    tags:article.tags,
  });

  const embedding=await generateEmbedding(embeddingText);

  return knowledgeBaseRepository.update(
    userId,
    article._id.toString(),
    {embedding},
  );
}

export async function updateKnowledgeBaseArticle(
  userId:string,
  id:string,
  data:{
    title?:string;
    content?:string;
    category?:string;
    tags?:string[];
    active?:boolean;
  },
){
  if(!Types.ObjectId.isValid(userId)||!Types.ObjectId.isValid(id)){
    throw new Error("Invalid user or article ID.");
  }

  const updateData:{
    title?:string;
    content?:string;
    category?:string;
    tags?:string[];
    active?:boolean;
  }={};

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
    const category=typeof data.category==="string"
      ?data.category.trim().toLowerCase()
      :"";

    if(!category)throw new Error("Article category cannot be empty.");

    updateData.category=category;
  }

  if(data.tags!==undefined){
    updateData.tags=Array.isArray(data.tags)
      ?data.tags
        .map((tag)=>typeof tag==="string"?tag.trim().toLowerCase():"")
        .filter(Boolean)
      :[];
  }

  if(data.active!==undefined){
    updateData.active=data.active;
  }

  const article=await knowledgeBaseRepository.update(
    userId,
    id,
    updateData,
  );

  if(!article)return null;

  const embeddingText=buildKnowledgeBaseEmbeddingText({
    title:article.title,
    content:article.content,
    category:article.category,
    tags:article.tags,
  });

  const embedding=await generateEmbedding(embeddingText);

  return knowledgeBaseRepository.update(
    userId,
    id,
    {embedding},
  );
}

export async function deleteKnowledgeBaseArticle(userId:string,id:string){
  if(!Types.ObjectId.isValid(userId)||!Types.ObjectId.isValid(id)){
    throw new Error("Invalid user or article ID.");
  }

  return knowledgeBaseRepository.delete(userId,id);
}

export async function getRelevantKnowledgeBase(userId:string,query:string){
  return searchKnowledgeBase(userId,query);
}
