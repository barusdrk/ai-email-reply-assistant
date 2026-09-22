import {Schema,model,type InferSchemaType,type HydratedDocument} from "mongoose";

export const DRAFT_TONES=["professional","friendly","formal","concise","empathetic","enthusiastic"] as const;
export type DraftTone=(typeof DRAFT_TONES)[number];

export const DRAFT_LENGTHS=["short","medium","long"] as const;
export type DraftLength=(typeof DRAFT_LENGTHS)[number];

export const DRAFT_STATUSES=["pending","approved","rejected","sent","escalated"] as const;
export type DraftStatus=(typeof DRAFT_STATUSES)[number];

export const DRAFT_PROVIDERS=["gmail","outlook"] as const;
export type DraftProvider=(typeof DRAFT_PROVIDERS)[number];

export const CONFIDENCE_LEVELS=["high","medium","low"] as const;
export type ConfidenceLevel=(typeof CONFIDENCE_LEVELS)[number];

export const AUTOMATIC_ACTIONS=["auto_approve","pending","escalate","blocked"] as const;
export type AutomaticAction=(typeof AUTOMATIC_ACTIONS)[number];

export const SUPPORT_CATEGORIES=["general_support","billing","technical","account","sales","refund","cancellation","shipping","complaint","other"] as const;
export type SupportCategory=(typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_SENTIMENTS=["positive","neutral","negative","urgent"] as const;
export type SupportSentiment=(typeof SUPPORT_SENTIMENTS)[number];

export const SUPPORT_DECISIONS=["reply","human_review","reject"] as const;
export type SupportDecision=(typeof SUPPORT_DECISIONS)[number];

const draftSchema=new Schema({
  userId:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true},
  emailId:{type:Schema.Types.ObjectId,ref:"Email",required:true,index:true},
  provider:{type:String,enum:DRAFT_PROVIDERS,required:true},
  subject:{type:String,required:true,trim:true},
  customer:{type:String,required:true,trim:true},
  reply:{type:String,required:true},
  tone:{type:String,enum:DRAFT_TONES,default:"professional"},
  length:{type:String,enum:DRAFT_LENGTHS,default:"medium"},
  status:{type:String,enum:DRAFT_STATUSES,default:"pending",index:true},
  automaticAction:{type:String,enum:AUTOMATIC_ACTIONS,default:"pending",index:true},
  automaticActionReasons:{type:[String],default:[]},
  automaticSendInProgress:{type:Boolean,default:false,index:true},
  confidence:{
    score:{type:Number,min:0,max:100,default:null},
    level:{type:String,enum:CONFIDENCE_LEVELS,default:null},
    reasons:{type:[String],default:[]},
  },
  supportCategory:{type:String,enum:SUPPORT_CATEGORIES,default:"general_support",index:true},
  supportSentiment:{type:String,enum:SUPPORT_SENTIMENTS,default:"neutral"},
  supportConfidence:{type:Number,min:0,max:1,default:null},
  supportDecision:{type:String,enum:SUPPORT_DECISIONS,default:null},
  supportNeedsHuman:{type:Boolean,default:false},
  supportReason:{type:String,default:""},
  supportSuggestedActions:{type:[String],default:[]},
  supportMissingInformation:{type:[String],default:[]},
  supportPolicyIssues:{type:[String],default:[]},
  escalatedAt:Date,
  escalationReason:String,
  escalationReasons:{type:[String],default:[]},
  approvedAt:Date,
  rejectionReason:String,
  sentAt:Date,
},{timestamps:true});

draftSchema.index({userId:1,status:1});
draftSchema.index({userId:1,createdAt:-1});
draftSchema.index({userId:1,automaticAction:1});

export type Draft=InferSchemaType<typeof draftSchema>;
export type DraftDocument=HydratedDocument<Draft>;

export default model<Draft>("Draft",draftSchema);
