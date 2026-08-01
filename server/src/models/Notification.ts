import {
  Schema,
  model,
  type InferSchemaType,
} from "mongoose";

const notificationSchema=new Schema({

  userId:{
    type:Schema.Types.ObjectId,
    ref:"User",
    required:true,
    index:true,
  },

  type:{
    type:String,
    enum:[
      "email",
      "draft",
      "approval",
      "sent",
      "system",
      "error",
    ],
    required:true,
  },

  title:{
    type:String,
    required:true,
    trim:true,
  },

  message:{
    type:String,
    required:true,
  },

  referenceId:String,

  read:{
    type:Boolean,
    default:false,
  },

},{
  timestamps:true,
});

notificationSchema.index({
  userId:1,
  read:1,
  createdAt:-1,
});

export type NotificationDocument=
  InferSchemaType<
    typeof notificationSchema
  >;

export const NotificationModel=
  model(
    "Notification",
    notificationSchema
  );

export default NotificationModel;
