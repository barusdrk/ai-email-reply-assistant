import {Types} from "mongoose";
import CustomerModel,{type CustomerDocument} from "../models/Customer.js";

type CrmProvider="hubspot";

class CustomerRepository{
  findAll(userId:string){
    if(!Types.ObjectId.isValid(userId))return CustomerModel.find({_id:null});
    return CustomerModel.find({
      userId:new Types.ObjectId(userId),
    }).sort({updatedAt:-1});
  }

  findById(id:string,userId?:string){
    if(!Types.ObjectId.isValid(id))return null;

    const filter:{
      _id:Types.ObjectId;
      userId?:Types.ObjectId;
    }={
      _id:new Types.ObjectId(id),
    };

    if(userId){
      if(!Types.ObjectId.isValid(userId))return null;
      filter.userId=new Types.ObjectId(userId);
    }

    return CustomerModel.findOne(filter);
  }

  findByEmail(userId:string,email:string){
    if(!Types.ObjectId.isValid(userId))return null;

    const normalizedEmail=email.trim().toLowerCase();

    if(!normalizedEmail)return null;

    return CustomerModel.findOne({
      userId:new Types.ObjectId(userId),
      email:normalizedEmail,
    });
  }

  findByCrmId(
    userId:string,
    crmProvider:CrmProvider,
    crmId:string,
  ){
    if(!Types.ObjectId.isValid(userId))return null;

    const normalizedCrmId=crmId.trim();

    if(!normalizedCrmId)return null;

    return CustomerModel.findOne({
      userId:new Types.ObjectId(userId),
      crmProvider,
      crmId:normalizedCrmId,
    });
  }

  async findOrCreate(
    userId:string,
    email:string,
    data:Partial<CustomerDocument>={},
  ){
    if(!Types.ObjectId.isValid(userId)){
      throw new Error("Invalid user ID.");
    }

    const normalizedEmail=email.trim().toLowerCase();

    if(!normalizedEmail){
      throw new Error("Customer email is required.");
    }

    const existing=await this.findByEmail(
      userId,
      normalizedEmail,
    );

    if(existing)return existing;

    return CustomerModel.create({
      ...data,
      userId:new Types.ObjectId(userId),
      email:normalizedEmail,
    });
  }

  async findOrCreateByCrmId(
    userId:string,
    crmProvider:CrmProvider,
    crmId:string,
    data:Partial<CustomerDocument>={},
  ){
    if(!Types.ObjectId.isValid(userId)){
      throw new Error("Invalid user ID.");
    }

    const normalizedCrmId=crmId.trim();

    if(!normalizedCrmId){
      throw new Error("CRM ID is required.");
    }

    const existing=await this.findByCrmId(
      userId,
      crmProvider,
      normalizedCrmId,
    );

    if(existing)return existing;

    if(!data.email){
      throw new Error("Customer email is required to create a CRM customer.");
    }

    const normalizedEmail=data.email.trim().toLowerCase();

    const existingByEmail=await this.findByEmail(
      userId,
      normalizedEmail,
    );

    if(existingByEmail){
      return CustomerModel.findByIdAndUpdate(
        existingByEmail._id,
        {
          $set:{
            crmProvider,
            crmId:normalizedCrmId,
          },
        },
        {new:true},
      );
    }

    return CustomerModel.create({
      ...data,
      userId:new Types.ObjectId(userId),
      email:normalizedEmail,
      crmProvider,
      crmId:normalizedCrmId,
    });
  }

  update(id:string,userId:string,data:Partial<CustomerDocument>){
    if(
      !Types.ObjectId.isValid(id)||
      !Types.ObjectId.isValid(userId)
    ){
      return null;
    }

    return CustomerModel.findOneAndUpdate(
      {
        _id:new Types.ObjectId(id),
        userId:new Types.ObjectId(userId),
      },
      {
        $set:data,
      },
      {new:true},
    );
  }

  async updateCrmIdentity(
    id:string,
    userId:string,
    crmProvider:CrmProvider,
    crmId:string,
  ){
    if(
      !Types.ObjectId.isValid(id)||
      !Types.ObjectId.isValid(userId)
    ){
      return null;
    }

    const normalizedCrmId=crmId.trim();

    if(!normalizedCrmId){
      throw new Error("CRM ID is required.");
    }

    return CustomerModel.findOneAndUpdate(
      {
        _id:new Types.ObjectId(id),
        userId:new Types.ObjectId(userId),
      },
      {
        $set:{
          crmProvider,
          crmId:normalizedCrmId,
        },
      },
      {new:true},
    );
  }

  async updateCrmData(
    id:string,
    userId:string,
    data:{
      crmProvider?:CrmProvider|null;
      crmId?:string;
      name?:string;
      company?:string;
      status?:"active"|"inactive"|"at_risk"|"vip"|"blocked";
      tags?:string[];
      notes?:string;
    },
  ){
    if(
      !Types.ObjectId.isValid(id)||
      !Types.ObjectId.isValid(userId)
    ){
      return null;
    }

    const update:{
      crmProvider?:CrmProvider|null;
      crmId?:string;
      name?:string;
      company?:string;
      status?:"active"|"inactive"|"at_risk"|"vip"|"blocked";
      tags?:string[];
      notes?:string;
    }={};

    if(data.crmProvider!==undefined){
      update.crmProvider=data.crmProvider;
    }

    if(data.crmId!==undefined){
      update.crmId=data.crmId.trim();
    }

    if(data.name!==undefined){
      update.name=data.name.trim();
    }

    if(data.company!==undefined){
      update.company=data.company.trim();
    }

    if(data.status!==undefined){
      update.status=data.status;
    }

    if(data.tags!==undefined){
      update.tags=data.tags;
    }

    if(data.notes!==undefined){
      update.notes=data.notes.trim();
    }

    return CustomerModel.findOneAndUpdate(
      {
        _id:new Types.ObjectId(id),
        userId:new Types.ObjectId(userId),
      },
      {
        $set:update,
      },
      {new:true},
    );
  }

  addConversationHistory(
    id:string,
    userId:string,
    conversation:{
      emailId?:Types.ObjectId;
      threadId?:string;
      subject?:string;
      category?:string;
      sentiment?:"positive"|"neutral"|"negative"|"urgent";
      summary?:string;
      lastMessageAt?:Date;
    },
  ){
    if(
      !Types.ObjectId.isValid(id)||
      !Types.ObjectId.isValid(userId)
    ){
      return null;
    }

    return CustomerModel.findOneAndUpdate(
      {
        _id:new Types.ObjectId(id),
        userId:new Types.ObjectId(userId),
      },
      {
        $push:{
          conversationHistory:conversation,
        },
      },
      {new:true},
    );
  }

  addSupportHistory(
    id:string,
    userId:string,
    support:{
      emailId?:Types.ObjectId;
      draftId?:Types.ObjectId;
      action:"replied"|"approved"|"rejected"|"escalated"|"blocked";
      category?:string;
      confidence?:number;
      summary?:string;
      createdAt?:Date;
    },
  ){
    if(
      !Types.ObjectId.isValid(id)||
      !Types.ObjectId.isValid(userId)
    ){
      return null;
    }

    return CustomerModel.findOneAndUpdate(
      {
        _id:new Types.ObjectId(id),
        userId:new Types.ObjectId(userId),
      },
      {
        $push:{
          supportHistory:support,
        },
      },
      {new:true},
    );
  }

  delete(id:string,userId:string){
    if(
      !Types.ObjectId.isValid(id)||
      !Types.ObjectId.isValid(userId)
    ){
      return null;
    }

    return CustomerModel.findOneAndDelete({
      _id:new Types.ObjectId(id),
      userId:new Types.ObjectId(userId),
    });
  }
}

export const customerRepository=new CustomerRepository();
export default customerRepository;
