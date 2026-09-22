import {Types} from "mongoose";
import EmailModel from "../models/Email.js";

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value);
}

export async function getSourceEmail(userId: string, emailId: string) {
  if (!isValidObjectId(userId)) throw new Error("Invalid user ID.");
  if (!isValidObjectId(emailId)) throw new Error("Invalid source email ID.");

  const sourceEmail = await EmailModel.findOne({
    _id: new Types.ObjectId(emailId),
    userId: new Types.ObjectId(userId),
  }).lean();

  if (!sourceEmail) throw new Error("Source email not found.");
  return sourceEmail;
}
