import {
  Schema,
  model,
  type InferSchemaType,
} from "mongoose";

const auditLogSchema=new Schema({

  action:{
    type:String,
    required:true,
    index:true,
  },

  entity:{
    type:String,
    required:true,
  },

  entityId:String,

  userId:{
    type:Schema.Types.ObjectId,
    ref:"User",
    index:true,
  },

  metadata:{
    type:Schema.Types.Mixed,
    default:{},
  },

},{
  timestamps:true,
});

auditLogSchema.index({
  userId:1,
  createdAt:-1,
});

export type AuditLogDocument=
  InferSchemaType<
    typeof auditLogSchema
  >;

export const AuditLogModel=
  model(
    "AuditLog",
    auditLogSchema
  );

export default AuditLogModel;
