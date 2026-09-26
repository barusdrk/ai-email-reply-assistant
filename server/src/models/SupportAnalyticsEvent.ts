import {Schema,model,type InferSchemaType,type HydratedDocument} from "mongoose";

export const SUPPORT_ANALYTICS_PROVIDERS=["gmail","outlook"] as const;
export type SupportAnalyticsProvider=(typeof SUPPORT_ANALYTICS_PROVIDERS)[number];

export const SUPPORT_ANALYTICS_ACTIONS=["auto_approve","pending","escalate","blocked"] as const;
export type SupportAnalyticsAction=(typeof SUPPORT_ANALYTICS_ACTIONS)[number];

export const SUPPORT_ANALYTICS_OUTCOMES=["auto_sent","pending_approval","approved","rejected","escalated","blocked","sent","failed",] as const;
export type SupportAnalyticsOutcome=(typeof SUPPORT_ANALYTICS_OUTCOMES)[number];

export const SUPPORT_ANALYTICS_CONFIDENCE_LEVELS=["high","medium","low"] as const;
export type SupportAnalyticsConfidenceLevel=(typeof SUPPORT_ANALYTICS_CONFIDENCE_LEVELS)[number];

export const SUPPORT_ANALYTICS_CATEGORIES=["general_support","billing","technical","account","sales","refund","cancellation","shipping","complaint","other"] as const;
export type SupportAnalyticsCategory=(typeof SUPPORT_ANALYTICS_CATEGORIES)[number];

const supportAnalyticsEventSchema=new Schema({
  userId:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true},
  emailId:{type:Schema.Types.ObjectId,ref:"Email",required:true,index:true},
  draftId:{type:Schema.Types.ObjectId,ref:"Draft",default:null,index:true},
  customerId:{type:Schema.Types.ObjectId,ref:"Customer",default:null,index:true},
  provider:{type:String,enum:SUPPORT_ANALYTICS_PROVIDERS,required:true,index:true},
  category:{type:String,enum:SUPPORT_ANALYTICS_CATEGORIES,default:"general_support",index:true},
  confidenceScore:{type:Number,min:0,max:100,default:null},
  confidenceLevel:{type:String,enum:SUPPORT_ANALYTICS_CONFIDENCE_LEVELS,default:null,index:true},
  policyCompliant:{type:Boolean,default:true,index:true},
  policyViolationCount:{type:Number,min:0,default:0},
  automaticAction:{type:String,enum:SUPPORT_ANALYTICS_ACTIONS,required:true,index:true},
  outcome:{type:String,enum:SUPPORT_ANALYTICS_OUTCOMES,required:true,index:true},
  supportDecision:{type:String,enum:["reply","human_review","reject"],default:null},
  supportNeedsHuman:{type:Boolean,default:false},
  createdAt:{type:Date,default:Date.now,index:true},
},{timestamps:true});

supportAnalyticsEventSchema.index({userId:1,createdAt:-1});
supportAnalyticsEventSchema.index({userId:1,automaticAction:1,createdAt:-1});
supportAnalyticsEventSchema.index({userId:1,confidenceLevel:1,createdAt:-1});
supportAnalyticsEventSchema.index({userId:1,category:1,createdAt:-1});
supportAnalyticsEventSchema.index({userId:1,outcome:1,createdAt:-1});

export type SupportAnalyticsEvent=InferSchemaType<typeof supportAnalyticsEventSchema>;
export type SupportAnalyticsEventDocument=HydratedDocument<SupportAnalyticsEvent>;

export default model<SupportAnalyticsEvent>("SupportAnalyticsEvent",supportAnalyticsEventSchema);
