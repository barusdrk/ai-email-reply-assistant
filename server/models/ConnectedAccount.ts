import { Schema, model, type InferSchemaType } from "mongoose";

const connectedAccountSchema = new Schema({
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

  providerUserId:{
    type:String,
    required:true,
  },

  email:{
    type:String,
    required:true,
    lowercase:true,
  },

  displayName:{
    type:String,
    default:"",
  },

  accessToken:{
    type:String,
    required:true,
  },

  refreshToken:{
    type:String,
    required:true,
  },

  tokenType:{
    type:String,
    default:"Bearer",
  },

  scope:{
    type:String,
    default:"",
  },

  expiryDate:Date,

  historyId:String,

  webhookId:String,

  watchExpiration:Date,

  connected:{
    type:Boolean,
    default:true,
  },

  syncStatus:{
    type:String,
    enum:[
      "idle",
      "syncing",
      "error",
    ],
    default:"idle",
  },

  lastSyncAt:Date,

  lastError:String,
},{
  timestamps:true,
});

connectedAccountSchema.index({
  userId:1,
  connected:1,
});

connectedAccountSchema.index({
  provider:1,
  providerUserId:1,
},{
  unique:true,
});

connectedAccountSchema.index({
  provider:1,
  email:1,
});

export type ConnectedAccountDocument =
  InferSchemaType<
    typeof connectedAccountSchema
  >;

export default model(
  "ConnectedAccount",
  connectedAccountSchema
);
