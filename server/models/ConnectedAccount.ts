import {
  Schema,
  model,
  type InferSchemaType,
} from "mongoose";

const connectedAccountSchema=new Schema({

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

  email:{
    type:String,
    required:true,
  },

  accessToken:String,

  refreshToken:String,

  expiresAt:Date,

  connected:{
    type:Boolean,
    default:true,
  },

},{
  timestamps:true,
});

connectedAccountSchema.index({
  userId:1,
  provider:1,
},{
  unique:true,
});

export type ConnectedAccountDocument=
  InferSchemaType<
    typeof connectedAccountSchema
  >;

export const ConnectedAccountModel=
  model(
    "ConnectedAccount",
    connectedAccountSchema
  );

export default ConnectedAccountModel;
