import { Schema, model, type InferSchemaType } from "mongoose";

const auditLogSchema=new Schema({
  userId:{type:Schema.Types.ObjectId,ref:"User",index:true},
  action:{
    type:String,
    required:true,
  },
  entity:{
    type:String,
    enum:[
      "user",
      "email",
      "draft",
      "approval",
      "gmail",
      "outlook",
      "system",
    ],
    required:true,
  },
  entityId:String,
  details:{type:Schema.Types.Mixed},
  ipAddress:String,
  userAgent:String,
},{
  timestamps:true,
});

auditLogSchema.index({
  userId:1,
  createdAt:-1,
});

auditLogSchema.index({
  entity:1,
  entityId:1,
});

export type AuditLogDocument=
  InferSchemaType<typeof auditLogSchema>;

export default model(
  "AuditLog",
  auditLogSchema
);
