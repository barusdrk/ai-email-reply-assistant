import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema({
  email:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
    index:true,
  },

  password:{
    type:String,
    required:true,
  },

  name:{
    type:String,
    default:"",
    trim:true,
  },

  avatar:{
    type:String,
    default:"",
  },

  role:{
    type:String,
    enum:[
      "user",
      "reviewer",
      "admin",
    ],
    default:"user",
  },

  provider:{
    type:String,
    enum:[
      "local",
      "google",
      "microsoft",
    ],
    default:"local",
  },

  signature:{
    type:String,
    default:"Best regards",
  },

  theme:{
    type:String,
    enum:[
      "light",
      "dark",
      "system",
    ],
    default:"system",
  },

  timezone:{
    type:String,
    default:"UTC",
  },

  language:{
    type:String,
    default:"en",
  },

  emailNotifications:{
    type:Boolean,
    default:true,
  },

  aiAutoDraft:{
    type:Boolean,
    default:true,
  },

  lastLogin:Date,
},{
  timestamps:true,
});

export type UserDocument =
  InferSchemaType<typeof userSchema>;

export default model(
  "User",
  userSchema
);
