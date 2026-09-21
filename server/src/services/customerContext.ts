import type {CustomerContext} from "./supportEngine.js";
import {searchContactByEmail} from "./hubspot.js";

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

function normalizeEmail(value?:string|null):string{
  return value?.trim().toLowerCase()??"";
}

function normalizeText(value?:string|null):string{
  return value?.trim()??"";
}

function firstValue(...values:Array<string|undefined|null>):string{
  return values.find((value)=>value?.trim())?.trim()??"";
}

export function buildCustomerContext(input:CustomerContextInput):CustomerContext{
  const result:CustomerContext={};
  const email=normalizeEmail(firstValue(input.email,input.customerEmail,input.senderEmail,input.fromEmail));
  const name=normalizeText(firstValue(input.name,input.customerName,input.senderName,input.fromName));
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

export async function getHubSpotCustomerContext(
  userId:string,
  email:string
):Promise<Partial<CustomerContext>>{
  const normalizedEmail=normalizeEmail(email);
  if(!normalizedEmail||!normalizedEmail.includes("@"))return {};

  const contact=await searchContactByEmail(userId,normalizedEmail);
  if(!contact)return {};

  const properties=contact.properties??{};
  const firstName=normalizeText(properties.firstname);
  const lastName=normalizeText(properties.lastname);
  const name=[firstName,lastName].filter(Boolean).join(" ");

  const metadata:Record<string,unknown>={
    crmProvider:"hubspot",
    hubspotContactId:contact.id,
    hubspotEmail:properties.email??normalizedEmail,
    hubspotFirstName:firstName||null,
    hubspotLastName:lastName||null,
    hubspotCompany:properties.company??null,
    hubspotPhone:properties.phone??null,
    hubspotCreatedAt:properties.createdate??null,
    hubspotUpdatedAt:properties.lastmodifieddate??null,
    ...(typeof contact.url==="string"?{hubspotUrl:contact.url}:{}),
  };

  return {
    email:typeof properties.email==="string"
      ?normalizeEmail(properties.email)
      :normalizedEmail,
    ...(name?{name}:{}),
    metadata,
  };
}

export async function enrichCustomerContextWithHubSpot(
  userId:string,
  context:CustomerContext
):Promise<CustomerContext>{
  if(!context.email)return context;

  try{
    const hubSpotContext=await getHubSpotCustomerContext(userId,context.email);
    if(!hubSpotContext.email&&!hubSpotContext.name&&!hubSpotContext.metadata)return context;

    const merged=mergeCustomerContext(context,hubSpotContext);

    if(context.name)merged.name=context.name;

    return merged;
  }catch(error){
    console.error("HubSpot customer context enrichment failed:",error);
    return context;
  }
}
