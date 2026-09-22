import {Schema,model,type InferSchemaType} from "mongoose";

const replyReservationSchema=new Schema(
  {
    id:{type:String,required:true},
    createdAt:{type:Date,default:Date.now},
  },
  {_id:false}
);

const subscriptionSchema=new Schema(
  {
    userId:{
      type:Schema.Types.ObjectId,
      ref:"User",
      required:true,
      unique:true,
    },
    plan:{
      type:String,
      enum:["free","starter","pro","business"],
      default:"free",
    },
    status:{
      type:String,
      enum:["active","cancelled","expired"],
      default:"active",
    },
    provider:{
      type:String,
      enum:["stripe","none"],
      default:"none",
    },
    customerId:{
      type:String,
      default:null,
    },
    subscriptionId:{
      type:String,
      default:null,
    },
    currentPeriodStart:{
      type:Date,
      default:null,
    },
    currentPeriodEnd:{
      type:Date,
      default:null,
    },
    dailyReplyCount:{
      type:Number,
      default:0,
      min:0,
    },
    monthlyReplyCount:{
      type:Number,
      default:0,
      min:0,
    },
    dailyReplyReserved:{
      type:Number,
      default:0,
      min:0,
    },
    monthlyReplyReserved:{
      type:Number,
      default:0,
      min:0,
    },
    dailyReplyResetAt:{
      type:Date,
      default:Date.now,
    },
    monthlyReplyResetAt:{
      type:Date,
      default:Date.now,
    },
    replyReservations:{
      type:[replyReservationSchema],
      default:[],
    },
  },
  {timestamps:true}
);

export type SubscriptionDocument=InferSchemaType<typeof subscriptionSchema>;
export const SubscriptionModel=model("Subscription",subscriptionSchema);
export default SubscriptionModel;
