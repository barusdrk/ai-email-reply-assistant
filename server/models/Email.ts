import {
  Schema,
  model,
  type InferSchemaType,
} from "mongoose";

const emailSchema=new Schema({

  userId:{
    type:Schema.Types.ObjectId,
    ref:"User",
    required:true,
    index:true,
  },

  provider:{
    type:String,
    enum:[
      "gmail",
      "outlook",
    ],
    required:true,
  },

  messageId:{
    type:String,
    required:true,
  },

  threadId:String,

  draftId:{
    type:Schema.Types.ObjectId,
    ref:"Draft",
  },

  from:String,

  to:String,

  subject:String,

  preview:String,

  body:String,

  unread:{
    type:Boolean,
    default:true,
  },

  archived:{
    type:Boolean,
    default:false,
  },

  receivedAt:{
    type:Date,
    required:true,
  },

},{
  timestamps:true,
});

emailSchema.index({
  userId:1,
  receivedAt:-1,
});

emailSchema.index({
  userId:1,
  messageId:1,
},{
  unique:true,
});

emailSchema.index({
  unread:1,
});

export type EmailDocument=
  InferSchemaType<
    typeof emailSchema
  >;

export const EmailModel=
  model(
    "Email",
    emailSchema
  );

export default EmailModel;
