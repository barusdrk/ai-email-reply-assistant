import { Schema, model, type InferSchemaType } from "mongoose";

const approvalSchema = new Schema({
  draftId:{type:Schema.Types.ObjectId,ref:"Draft",required:true,index:true},
  emailId:{type:Schema.Types.ObjectId,ref:"Email",required:true,index:true},
  requesterId:{type:Schema.Types.ObjectId,ref:"User",required:true},
  reviewerId:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true},
  status:{
    type:String,
    enum:["pending","approved","rejected"],
    default:"pending",
  },
  priority:{
    type:String,
    enum:["low","medium","high"],
    default:"medium",
  },
  comment:{type:String,default:""},
  reviewedBy:{type:Schema.Types.ObjectId,ref:"User"},
  requestedAt:{type:Date,default:Date.now},
  reviewedAt:Date,
},{
  timestamps:true,
});

approvalSchema.index({
  reviewerId:1,
  status:1,
  createdAt:-1,
});

approvalSchema.index({
  requesterId:1,
  createdAt:-1,
});

approvalSchema.index({
  draftId:1,
});

export type ApprovalDocument =
  InferSchemaType<typeof approvalSchema>;

export default model(
  "Approval",
  approvalSchema
);
