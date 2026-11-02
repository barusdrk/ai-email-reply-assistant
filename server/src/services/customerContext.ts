import type {CustomerContext} from "./supportEngine.js";
import {customerRepository} from "../repositories/CustomerRepository.js";
import {syncCustomerFromCrm} from "./crmSync.js";

export type CustomerContextInput={
  email?:string|null;
  name?:string|null;
  customerEmail?:string|null;
  customerName?:string|null;
  senderEmail?:string|null;
  senderName?:string|null;
  fromEmail?:string|null;
  fromName?:string|null;
  subject?:string|null;
  body?:string|null;
  plan?:string|null;
  status?:string|null;
  accountId?:string|null;
  metadata?:Record<string,unknown>|null;
};

const GENERIC_SENDER_NAMES=new Set([
  "admin","billing","contact","customerservice","customer support","help",
  "helpdesk","info","mail delivery subsystem","no reply","noreply",
  "notifications","office","sales","service","support","support team",
  "team","webmaster",
]);

function normalizeEmail(value?:string|null):string{
  return value?.trim().toLowerCase()??"";
}

function normalizeText(value?:string|null):string{
  return value?.trim().replace(/\s+/g," ")??"";
}

function firstValue(...values:Array<string|undefined|null>):string{
  return values.find((value)=>value?.trim())?.trim()??"";
}

export function resolveCustomerName(
  candidates:Array<string|undefined|null>,
  email?:string|null,
):string{
  const normalizedEmail=normalizeEmail(email);
  const localPart=normalizedEmail.split("@")[0]??"";
  const localPartCompact=localPart.replace(/[^a-z0-9]/g,"");
  for(const candidate of candidates){
    const name=normalizeText(candidate);
    if(!name||name.length>100||/[<>@\r\n]/.test(name))continue;
    const normalized=name.toLowerCase().replace(/[^a-z0-9]/g,"");
    if(!normalized||GENERIC_SENDER_NAMES.has(name.toLowerCase()))continue;
    if(normalizedEmail&&name.toLowerCase()===normalizedEmail)continue;
    // Avoid greeting a customer with a name that appears to have been copied
    // from the mailbox username (including common first-name prefixes).
    if(localPartCompact&&(
      normalized===localPartCompact||
      (localPartCompact.startsWith(normalized)&&localPartCompact.length-normalized.length>=2)
    ))continue;
    return name;
  }
  return "";
}

export function buildCustomerContext(input:CustomerContextInput):CustomerContext{
  const result:CustomerContext={};
  const email=normalizeEmail(firstValue(input.email,input.customerEmail,input.senderEmail,input.fromEmail));
  const name=resolveCustomerName(
    [input.name,input.customerName,input.senderName,input.fromName],
    email,
  );
  const plan=normalizeText(input.plan);
  const status=normalizeText(input.status);
  const accountId=normalizeText(input.accountId);
  const metadata=input.metadata;
  if(email)result.email=email;
  if(name)result.name=name;
  if(plan)result.plan=plan;
  if(status)result.status=status;
  if(accountId)result.accountId=accountId;
  if(metadata&&Object.keys(metadata).length>0)result.metadata=metadata;
  return result;
}

export function buildCustomerContextFromCustomer(customer:unknown):CustomerContext{
  if(!customer||typeof customer!=="object")return {};
  const value=customer as Record<string,unknown>;
  const metadata=value.metadata;
  return buildCustomerContext({
    email:typeof value.email==="string"?value.email:null,
    name:typeof value.name==="string"?value.name:null,
    plan:typeof value.plan==="string"?value.plan:null,
    status:typeof value.status==="string"?value.status:null,
    accountId:typeof value.accountId==="string"?value.accountId:null,
    metadata:metadata&&typeof metadata==="object"&&!Array.isArray(metadata)
      ?metadata as Record<string,unknown>
      :null,
  });
}

export function getCustomerContextFromEmail(
  input:CustomerContextInput|string|null|undefined,
  fallbackEmail?:string|null
):CustomerContext{
  if(!input)return {};
  if(typeof input==="string"){
    const email=normalizeEmail(input);
    return email&&email.includes("@")?{email}:{};
  }
  const context=buildCustomerContext(input);
  if(!context.email&&fallbackEmail){
    const email=normalizeEmail(fallbackEmail);
    if(email&&email.includes("@"))context.email=email;
  }
  return context;
}

export function mergeCustomerContext(
  base:CustomerContext,
  additional:Partial<CustomerContext>
):CustomerContext{
  const result:CustomerContext={...base,...additional};
  if(base.metadata||additional.metadata){
    result.metadata={...(base.metadata??{}),...(additional.metadata??{})};
  }
  return result;
}

export function getCustomerContextByEmail(
  input:CustomerContextInput|string|null|undefined,
  fallbackEmail?:string|null
):CustomerContext{
  return getCustomerContextFromEmail(input,fallbackEmail);
}

export function getCustomerContext(input:CustomerContextInput):CustomerContext{
  return buildCustomerContext(input);
}

export async function getCrmCustomerContext(
  userId:string,
  email:string
):Promise<Partial<CustomerContext>>{
  const normalizedEmail=normalizeEmail(email);
  if(!normalizedEmail||!normalizedEmail.includes("@"))return {};
  try{
    const syncResult=await syncCustomerFromCrm(userId,normalizedEmail);
    if(!syncResult)return {};
    const customer=await customerRepository.findById(syncResult.customerId,userId);
    if(!customer)return {};
    const context=buildCustomerContextFromCustomer(customer);
    const metadata={
      ...(context.metadata??{}),
      customerId:String(customer._id),
      ...(customer.crmProvider?{crmProvider:customer.crmProvider}:{}),
      ...(customer.crmId?{crmId:customer.crmId}:{}),
      crmSynced:syncResult.synced,
      crmConnected:syncResult.connected,
    };
    return {
      ...context,
      email:context.email??normalizedEmail,
      metadata,
    };
  }catch(error){
    console.error("CRM customer context enrichment failed:",{
      userId,
      email:normalizedEmail,
      error,
    });
    return {};
  }
}

export async function enrichCustomerContextWithCrm(
  userId:string,
  context:CustomerContext
):Promise<CustomerContext>{
  if(!context.email)return context;
  try{
    const crmContext=await getCrmCustomerContext(userId,context.email);
    if(!crmContext.email&&!crmContext.name&&!crmContext.metadata)return context;
    const merged=mergeCustomerContext(context,crmContext);
    if(context.email)merged.email=context.email;
    return merged;
  }catch(error){
    console.error("CRM customer context enrichment failed:",error);
    return context;
  }
}

export async function enrichCustomerContextWithHubSpot(
  userId:string,
  context:CustomerContext
):Promise<CustomerContext>{
  return enrichCustomerContextWithCrm(userId,context);
}

export async function getHubSpotCustomerContext(
  userId:string,
  email:string
):Promise<Partial<CustomerContext>>{
  return getCrmCustomerContext(userId,email);
}
