import {Schema,model,type InferSchemaType} from "mongoose";

const emailCategories=["refund","cancellation","billing","account","technical","shipping","product","feature_request","complaint","other"] as const;
const emailDirections=["inbound","outbound"] as const;
const supportProcessingStatuses=["pending","processing","completed","failed"] as const;

const emailSchema=new Schema(
  {
    userId:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true},
    customerId:{type:Schema.Types.ObjectId,ref:"Customer",default:null,index:true},
    draftId:{type:Schema.Types.ObjectId,ref:"Draft",default:null,index:true},
    provider:{type:String,enum:["gmail","outlook"],required:true},
    direction:{type:String,enum:emailDirections,default:"inbound",required:true,index:true},
    messageId:{type:String,required:true},
    messageIdHeader:{type:String,default:""},
    references:{type:[String],default:[]},
    threadId:{type:String,default:""},
    subject:{type:String,default:"",trim:true},
    from:{type:String,default:"",trim:true},
    senderName:{type:String,default:"",trim:true},
    senderEmail:{type:String,default:"",trim:true},
    recipientName:{type:String,default:"",trim:true},
    recipientEmail:{type:String,default:"",trim:true},
    preview:{type:String,default:""},
    body:{type:String,default:""},
    classification:{
      category:{type:String,enum:emailCategories,default:"other"},
      confidence:{type:Number,default:0,min:0,max:1},
    },
    supportProcessingStatus:{
      type:String,
      enum:supportProcessingStatuses,
      default:"pending",
    },
    supportProcessingError:{
      type:String,
      default:"",
    },
    supportProcessingAttempts:{
      type:Number,
      default:0,
      min:0,
    },
    supportProcessingStartedAt:{
      type:Date,
      default:null,
    },
    supportProcessedAt:{
      type:Date,
      default:null,
    },
    unread:{type:Boolean,default:true},
    archived:{type:Boolean,default:false},
    receivedAt:{type:Date,default:Date.now},
  },
  {timestamps:true},
);

emailSchema.index({userId:1,provider:1,messageId:1},{unique:true});
emailSchema.index({userId:1,direction:1,receivedAt:-1});
emailSchema.index({userId:1,receivedAt:-1});
emailSchema.index({userId:1,threadId:1});
emailSchema.index({userId:1,customerId:1});
emailSchema.index({userId:1,draftId:1});
emailSchema.index({userId:1,supportProcessingStatus:1,receivedAt:-1});

export type EmailDocument=InferSchemaType<typeof emailSchema>;
export const EmailModel=model("Email",emailSchema);
export default EmailModel;
