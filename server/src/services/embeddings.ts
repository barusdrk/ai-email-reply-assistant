import OpenAI from "openai";
import {env} from "../config/env.js";

const EMBEDDING_MODEL="text-embedding-3-small";
const MAX_EMBEDDING_INPUT_CHARS=24000;

function getClient(){
  if(!env.OPENAI_API_KEY){
    throw new Error("OpenAI is not configured.");
  }

  return new OpenAI({
    apiKey:env.OPENAI_API_KEY,
  });
}

function truncateEmbeddingInput(text:string):string{
  const value=text.trim();

  if(value.length<=MAX_EMBEDDING_INPUT_CHARS){
    return value;
  }

  return value.slice(0,MAX_EMBEDDING_INPUT_CHARS);
}

export function buildKnowledgeBaseEmbeddingText(input:{
  title:string;
  content:string;
  category?:string;
  tags?:string[];
}){
  const text=[
    `Title: ${input.title}`,
    `Category: ${input.category??"general"}`,
    `Tags: ${(input.tags??[]).join(", ")}`,
    `Content: ${input.content}`,
  ].join("\n");

  return truncateEmbeddingInput(text);
}

export async function generateEmbedding(text:string):Promise<number[]>{
  const value=truncateEmbeddingInput(text);

  if(!value){
    throw new Error("Embedding text cannot be empty.");
  }

  const response=await getClient().embeddings.create({
    model:EMBEDDING_MODEL,
    input:value,
  });

  const embedding=response.data[0]?.embedding;

  if(!embedding){
    throw new Error("Failed to generate embedding.");
  }

  return embedding;
}
