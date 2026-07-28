import {
  Schema,
  model,
  type InferSchemaType,
} from "mongoose";

const draftSchema=new Schema({

  userId:{
    type:Schema.Types.ObjectId,
    ref:"User",
    required:true,
    index:true,
  },

  emailId:{
    type:Schema.Types.ObjectId,
    ref:"Email",
    required:true,
    index:true,
  },

  subject:{
    type:String,
    required:true,
    trim:true,
  },

  reply:{
    type:String,
    required:true,
  },

  tone:{
    type:String,
    default:"professional",
  },

  status:{
    type:String,
    enum:[
      "pending",
      "approved",
      "rejected",
      "sent",
    ],
    default:"pending",
  },

  approvedAt:Date,

  rejectionReason:String,

  sentAt:Date,

},{
  timestamps:true,
});

draftSchema.index({
  userId:1,
  createdAt:-1,
});

draftSchema.index({
  status:1,
});

export type DraftDocument=
  InferSchemaType<
    typeof draftSchema
  >;

export const DraftModel=
  model(
    "Draft",
    draftSchema
  );

export default DraftModel;
