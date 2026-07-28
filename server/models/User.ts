import {
  Schema,
  model,
  type InferSchemaType,
} from "mongoose";

const userSchema=new Schema({

  name:{
    type:String,
    required:true,
    trim:true,
  },

  email:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
  },

  password:{
    type:String,
    required:true,
  },

  role:{
    type:String,
    enum:[
      "user",
      "admin",
    ],
    default:"user",
  },

  avatar:String,

  emailVerified:{
    type:Boolean,
    default:false,
  },

  lastLoginAt:Date,

  active:{
    type:Boolean,
    default:true,
  },

},{
  timestamps:true,
});

userSchema.index({
  email:1,
},{
  unique:true,
});

export type UserDocument=
  InferSchemaType<
    typeof userSchema
  >;

export const UserModel=
  model(
    "User",
    userSchema
  );

export default UserModel;
