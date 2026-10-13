import {draftRepository} from "../repositories/DraftRepository.js";
import {createDraft as createDraftFromSupportResult} from "./draftCreation.js";
import {updateDraft as updateDraftService} from "./draftUpdate.js";
import {approveDraft,rejectDraft} from "./draftApproval.js";
import {sendDraft} from "./draftSending.js";
import {submitDraft as submitDraftService} from "./draftWorkflow.js";
import {isValidObjectId} from "./draftValidation.js";
import type {CreateDraftData,DraftStatus,UpdateDraftData} from "./draftTypes.js";
import type {Draft} from "../models/Draft.js";

export function drafts(userId:string,status?:DraftStatus){
  if(!isValidObjectId(userId))throw new Error("Invalid user ID.");
  return draftRepository.findAll(userId,status);
}

export function draft(id:string){
  if(!isValidObjectId(id))throw new Error("Invalid draft ID.");
  return draftRepository.findById(id);
}

type CreateDraftOptions = {returnCreationResult?:boolean};
type CreateDraftResult = {draft:Draft;created:boolean};

export function createDraft(data:CreateDraftData):Promise<Draft>;
export function createDraft(data:CreateDraftData,options:{returnCreationResult:true}):Promise<CreateDraftResult>;
export async function createDraft(data:CreateDraftData,options:CreateDraftOptions={}):Promise<Draft|CreateDraftResult>{
  return createDraftFromSupportResult(data,options);
}

export async function updateDraft(id:string,data:UpdateDraftData){
  if(!isValidObjectId(id))throw new Error("Invalid draft ID.");
  return updateDraftService(id,data);
}

export async function submitDraft(id:string,userId:string){
  if(!isValidObjectId(id))throw new Error("Invalid draft ID.");
  if(!isValidObjectId(userId))throw new Error("Invalid user ID.");
  return submitDraftService(id,userId);
}

export {approveDraft,rejectDraft,sendDraft};
export {createDraft as createDraftFromSupportResult} from "./draftCreation.js";

export function deleteDraft(id:string){
  if(!isValidObjectId(id))throw new Error("Invalid draft ID.");
  return draftRepository.delete(id);
}
