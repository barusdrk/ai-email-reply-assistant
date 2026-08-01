import OpenAI from "openai";
import { env } from "./env.js";

export const openai=new OpenAI({
  apiKey:env.OPENAI_API_KEY,
});

export const DEFAULT_MODEL=
  env.OPENAI_MODEL;

export async function generateText(
  prompt:string
){
  const response=
    await openai.responses.create({
      model:DEFAULT_MODEL,
      input:prompt,
    });

  return (
    response.output_text ??
    ""
  ).trim();
}

export async function generateJson<T>(
  prompt:string
){
  const response=
    await openai.responses.create({
      model:DEFAULT_MODEL,
      input:prompt,
      text:{
        format:{
          type:"json_object",
        },
      },
    });

  return JSON.parse(
    response.output_text
  ) as T;
}
