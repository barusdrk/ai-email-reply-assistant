import {draftRepository} from "../repositories/DraftRepository.js";
import type {DraftStatus} from "./draftTypes.js";

export function drafts(userId: string, status?: DraftStatus) {
  return draftRepository.findAll(userId, status);
}

export function draft(id: string) {
  return draftRepository.findById(id);
}

export function draftByEmailId(emailId: string) {
  return draftRepository.findByEmailId(emailId);
}
