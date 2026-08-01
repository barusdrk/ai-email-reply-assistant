import pino from "pino";
import { env } from "./env.js";

export const logger=pino({
  level:
    env.NODE_ENV==="production"
      ?"info"
      :"debug",

  transport:
    env.NODE_ENV==="production"
      ?undefined
      :{
          target:"pino-pretty",
          options:{
            colorize:true,
            translateTime:true,
          },
        },
});

export function logError(
  error:unknown,
  message="Unexpected error"
){
  logger.error({
    error,
    message,
  });
}

export function logInfo(
  message:string,
  data?:unknown
){
  logger.info({
    message,
    data,
  });
}

export function logWarn(
  message:string,
  data?:unknown
){
  logger.warn({
    message,
    data,
  });
}
