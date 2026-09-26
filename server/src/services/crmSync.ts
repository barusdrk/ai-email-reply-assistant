import {customerRepository} from "../repositories/CustomerRepository.js";
import {getHubSpotAccount,searchContactByEmail} from "./hubspot.js";
import type {CrmProvider} from "../models/Customer.js";

export interface CrmCustomerSyncResult{
  customerId:string;
  provider:CrmProvider|null;
  crmId:string;
  synced:boolean;
  created:boolean;
  updated:boolean;
  connected:boolean;
  source:"crm"|"local";
}

type HubSpotContact=NonNullable<Awaited<ReturnType<typeof searchContactByEmail>>>;

function getHubSpotProperty(contact:HubSpotContact,name:string):string{
  const properties=(contact as {properties?:Record<string,unknown>}).properties;
  const value=properties?.[name];
  return typeof value==="string"?value.trim():"";
}

function getHubSpotName(contact:HubSpotContact):string{
  const firstName=getHubSpotProperty(contact,"firstname");
  const lastName=getHubSpotProperty(contact,"lastname");
  return [firstName,lastName].filter(Boolean).join(" ").trim();
}

function getHubSpotEmail(contact:HubSpotContact):string{
  return getHubSpotProperty(contact,"email").toLowerCase();
}

function getHubSpotCompany(contact:HubSpotContact):string{
  return getHubSpotProperty(contact,"company");
}

async function getLocalCustomer(userId:string,email:string){
  return customerRepository.findByEmail(userId,email);
}

async function createOrGetLocalCustomer(
  userId:string,
  email:string,
  name?:string,
  company?:string,
):Promise<CrmCustomerSyncResult>{
  const normalizedEmail=email.trim().toLowerCase();
  const existing=await getLocalCustomer(userId,normalizedEmail);

  if(existing){
    const updated=await customerRepository.update(
      existing._id.toString(),
      userId,
      {
        name:name||undefined,
        company:company||undefined,
      },
    );

    return {
      customerId:String(updated?._id??existing._id),
      provider:existing.crmProvider??null,
      crmId:existing.crmId??"",
      synced:false,
      created:false,
      updated:Boolean(updated),
      connected:false,
      source:"local",
    };
  }

  const created=await customerRepository.findOrCreate(
    userId,
    normalizedEmail,
    {
      email:normalizedEmail,
      name:name??"",
      company:company??"",
    },
  );

  if(!created)throw new Error("Failed to create or find local customer.");

  return {
    customerId:String(created._id),
    provider:created.crmProvider??null,
    crmId:created.crmId??"",
    synced:false,
    created:true,
    updated:false,
    connected:false,
    source:"local",
  };
}

async function syncHubSpotCustomer(
  userId:string,
  email:string,
):Promise<CrmCustomerSyncResult>{
  const normalizedEmail=email.trim().toLowerCase();

  if(!normalizedEmail){
    throw new Error("Customer email is required for CRM synchronization.");
  }

  const contact=await searchContactByEmail(userId,normalizedEmail);

  if(!contact){
    console.log("CRM CONTACT NOT FOUND:",{
      provider:"hubspot",
      email:normalizedEmail,
      action:"create_local_customer",
    });

    return createOrGetLocalCustomer(
      userId,
      normalizedEmail,
    );
  }

  const crmId=String(contact.id??"").trim();
  const crmEmail=getHubSpotEmail(contact)||normalizedEmail;
  const name=getHubSpotName(contact);
  const company=getHubSpotCompany(contact);

  if(!crmId){
    throw new Error("HubSpot returned a contact without a contact ID.");
  }

  const existingByCrmId=await customerRepository.findByCrmId(
    userId,
    "hubspot",
    crmId,
  );

  if(existingByCrmId){
    const updated=await customerRepository.updateCrmData(
      existingByCrmId._id.toString(),
      userId,
      {
        crmProvider:"hubspot",
        crmId,
        name:name||undefined,
        company:company||undefined,
      },
    );

    return {
      customerId:String(updated?._id??existingByCrmId._id),
      provider:"hubspot",
      crmId,
      synced:true,
      created:false,
      updated:Boolean(updated),
      connected:true,
      source:"crm",
    };
  }

  const existingByEmail=await getLocalCustomer(
    userId,
    crmEmail,
  );

  if(existingByEmail){
    const updated=await customerRepository.updateCrmData(
      existingByEmail._id.toString(),
      userId,
      {
        crmProvider:"hubspot",
        crmId,
        name:name||undefined,
        company:company||undefined,
      },
    );

    return {
      customerId:String(updated?._id??existingByEmail._id),
      provider:"hubspot",
      crmId,
      synced:true,
      created:false,
      updated:Boolean(updated),
      connected:true,
      source:"crm",
    };
  }

  const created=await customerRepository.findOrCreateByCrmId(
    userId,
    "hubspot",
    crmId,
    {
      email:crmEmail,
      name,
      company,
    },
  );

  if(!created){
    throw new Error("Failed to create or link local customer.");
  }

  return {
    customerId:String(created._id),
    provider:"hubspot",
    crmId,
    synced:true,
    created:true,
    updated:false,
    connected:true,
    source:"crm",
  };
}

export async function syncCustomerFromCrm(
  userId:string,
  email:string,
):Promise<CrmCustomerSyncResult|null>{
  const normalizedEmail=email.trim().toLowerCase();

  if(!normalizedEmail){
    throw new Error("Customer email is required.");
  }

  try{
    const account=await getHubSpotAccount(userId);

    if(!account?.connected){
      return createOrGetLocalCustomer(
        userId,
        normalizedEmail,
      );
    }

    return await syncHubSpotCustomer(
      userId,
      normalizedEmail,
    );
  }catch(error){
    console.error("CRM customer synchronization failed:",{
      userId,
      email:normalizedEmail,
      error,
    });

    return createOrGetLocalCustomer(
      userId,
      normalizedEmail,
    );
  }
}

export async function syncCustomerForEmail(
  userId:string,
  email:string,
):Promise<CrmCustomerSyncResult|null>{
  return syncCustomerFromCrm(userId,email);
}

export async function syncCustomerById(
  userId:string,
  customerId:string,
):Promise<CrmCustomerSyncResult|null>{
  const customer=await customerRepository.findById(
    customerId,
    userId,
  );

  if(!customer)throw new Error("Customer not found.");

  return syncCustomerFromCrm(
    userId,
    customer.email,
  );
}
