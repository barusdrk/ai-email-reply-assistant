import {
  Schema,
  model,
  Types,
  type InferSchemaType,
} from "mongoose";

const aiSettingsSchema =
new Schema({
  userId:{
    type:Schema.Types.ObjectId,
    ref:"User",
    required:true,
    unique:true,
  },

  provider:{
    type:String,
    enum:[
      "openai",
      "gemini",
    ],
    default:"gemini",
  },

  maxDailyReplies:{
    type:Number,
    default:20,
  },

  temperature:{
    type:Number,
    default:0.7,
  },

  defaultTone:{
    type:String,
    default:"professional",
  },

  defaultLength:{
    type:String,
    default:"medium",
  },

},{
  timestamps:true,
});

export type AISettingsDocument =
  InferSchemaType<
    typeof aiSettingsSchema
  >;

export default model(
  "AISettings",
  aiSettingsSchema
);
