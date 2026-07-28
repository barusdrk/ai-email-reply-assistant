import { Schema, model, type InferSchemaType } from "mongoose";

const draftSchema=new Schema({
  userId:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true},
  emailId:{type:Schema.Types.ObjectId,ref:"Email",required:true},
  reply:{type:String,required:true},
  tone:{
    type:String,
    enum:[
      "professional",
      "friendly",
      "empathetic",
      "concise",
      "formal",
      "enthusiastic",
    ],
    default:"professional",
  },
  length:{
    type:String,
    enum:["short","medium","long"],
    default:"medium",
  },
  status:{
    type:String,
    enum:[
      "draft",
      "pending",
      "approved",
      "rejected",
      "scheduled",
      "sent",
    ],
    default:"draft",
  },
  approvedBy:{type:Schema.Types.ObjectId,ref:"User"},
  scheduledFor:Date,
  sentAt:Date,
},{
  timestamps:true,
});

draftSchema.index({userId:1,status:1});
draftSchema.index({emailId:1});

export type DraftDocument=InferSchemaType<typeof draftSchema>;

export default model("Draft",draftSchema);
