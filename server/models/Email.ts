import { Schema, model, type InferSchemaType } from "mongoose";

const emailSchema=new Schema({
  userId:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true},
  provider:{type:String,enum:["gmail","outlook"],required:true},
  messageId:{type:String,required:true,unique:true},
  threadId:String,
  from:{type:String,required:true},
  to:{type:String,default:""},
  cc:[String],
  bcc:[String],
  subject:{type:String,default:""},
  preview:{type:String,default:""},
  body:{type:String,default:""},
  labels:[String],
  unread:{type:Boolean,default:true},
  priority:{type:String,enum:["low","medium","high"],default:"medium"},
  category:{type:String,default:"General"},
  summary:String,
  draftId:{type:Schema.Types.ObjectId,ref:"Draft"},
  receivedAt:Date,
},{
  timestamps:true,
});

emailSchema.index({userId:1,receivedAt:-1});
emailSchema.index({provider:1,messageId:1});

export type EmailDocument=InferSchemaType<typeof emailSchema>;

export default model("Email",emailSchema);
