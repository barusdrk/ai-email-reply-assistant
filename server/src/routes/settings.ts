import {Router,type Request,type Response} from "express";
import {auth} from "../middleware/auth.js";
import {getSettings,updateSettings,resetSettings,type SettingsUpdate} from "../services/settings.js";
import {getPlan,isAIProviderAllowed} from "../services/billing.js";

const router=Router();
router.use(auth);
const AI_PROVIDERS=["openai","gemini","groq","claude"] as const;
const DEFAULT_REPLY_TONES=["friendly","formal","professional","concise","empathetic","enthusiastic"] as const;
const DEFAULT_REPLY_LENGTHS=["short","medium","long"] as const;

function formatSettings(settings:any){
  return {
    ...settings,
    provider:settings.provider??"groq",
    defaultReplyTone:settings.defaultReplyTone??"formal",
    defaultLength:settings.defaultLength??"medium",
    autoDraft:settings.autoDraft??false,
    autoSendEnabled:settings.autoSendEnabled??false,
    emailNotifications:settings.emailNotifications??true,
    desktopNotifications:settings.desktopNotifications??false,
  };
}

function validateUpdates(body:unknown):{updates:SettingsUpdate;error?:string}{
  if(!body||typeof body!=="object"||Array.isArray(body))return {updates:{},error:"Settings must be an object."};
  const input=body as Record<string,unknown>;
  const updates:Record<string,unknown>={};
  const allowed=["provider","defaultReplyTone","defaultLength","maxDailyReplies","temperature","signature","autoDraft","autoSendEnabled","emailNotifications","desktopNotifications"];
  for(const key of allowed)if(Object.prototype.hasOwnProperty.call(input,key))updates[key]=input[key];
  if(updates.provider!==undefined&&!(AI_PROVIDERS as readonly unknown[]).includes(updates.provider))return {updates,error:"Invalid AI provider."};
  if(updates.defaultReplyTone!==undefined&&!(DEFAULT_REPLY_TONES as readonly unknown[]).includes(updates.defaultReplyTone))return {updates,error:"Invalid default reply tone."};
  if(updates.defaultLength!==undefined&&!(DEFAULT_REPLY_LENGTHS as readonly unknown[]).includes(updates.defaultLength))return {updates,error:"Invalid default reply length."};
  for(const key of ["autoDraft","autoSendEnabled","emailNotifications","desktopNotifications"]){
    if(updates[key]!==undefined&&typeof updates[key]!=="boolean")return {updates,error:key+" must be a boolean."};
  }
  if(updates.maxDailyReplies!==undefined&&(typeof updates.maxDailyReplies!=="number"||!Number.isInteger(updates.maxDailyReplies)||updates.maxDailyReplies<1||updates.maxDailyReplies>10000))return {updates,error:"maxDailyReplies must be an integer between 1 and 10000."};
  if(updates.temperature!==undefined&&(typeof updates.temperature!=="number"||!Number.isFinite(updates.temperature)||updates.temperature<0||updates.temperature>2))return {updates,error:"temperature must be a number between 0 and 2."};
  if(updates.signature!==undefined&&(typeof updates.signature!=="string"||updates.signature.length>5000))return {updates,error:"signature must be a string of at most 5000 characters."};
  return {updates:updates as SettingsUpdate};
}

router.get("/",async(req:Request,res:Response)=>{
  if(!req.user){res.status(401).json({message:"Unauthorized."});return;}
  try{res.json(formatSettings(await getSettings(req.user.id)));}
  catch(error){res.status(500).json({message:error instanceof Error?error.message:"Failed to load settings."});}
});

router.put("/",async(req:Request,res:Response)=>{
  if(!req.user){res.status(401).json({message:"Unauthorized."});return;}
  try{
    const {updates,error}=validateUpdates(req.body);
    if(error){res.status(400).json({message:error});return;}
    if(updates.provider!==undefined){
      const plan=await getPlan(req.user.id);
      if(!isAIProviderAllowed(plan,updates.provider as typeof AI_PROVIDERS[number])){
        res.status(403).json({message:"The Free plan only supports the Groq AI provider. Upgrade your plan to use another AI provider."});
        return;
      }
    }
    const settings=await updateSettings(req.user.id,updates);
    res.json(formatSettings(settings));
  }catch(error){res.status(500).json({message:error instanceof Error?error.message:"Failed to update settings."});}
});

router.post("/reset",async(req:Request,res:Response)=>{
  if(!req.user){res.status(401).json({message:"Unauthorized."});return;}
  try{res.json(formatSettings(await resetSettings(req.user.id)));}
  catch(error){res.status(500).json({message:error instanceof Error?error.message:"Failed to reset settings."});}
});
export default router;
