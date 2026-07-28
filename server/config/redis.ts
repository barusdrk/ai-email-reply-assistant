import IORedis from "ioredis";
import { env } from "./env.js";

export const redis=new IORedis(
  env.REDIS_URL,
  {
    maxRetriesPerRequest:null,
    enableReadyCheck:true,
  }
);

redis.on("connect",()=>{
  console.log("Redis connected");
});

redis.on("error",(error)=>{
  console.error(error);
});

export default redis;
