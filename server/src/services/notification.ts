import {Types} from "mongoose";
import UserModel from "../models/User.js";
import Notification from "../models/Notification.js";
import {connectedAccountRepository} from "../repositories/ConnectedAccountRepository.js";
import {sendEmail} from "./sendEmail.js";

type EmailProvider="gmail"|"outlook";

type NotifyNewCustomerEmailInput={
  userId:string;
  provider:EmailProvider;
  from:string;
  subject:string;
  preview:string;
  emailId:string;
};

function normalizeEmail(value:string):string{
  return value.trim().toLowerCase();
}

export async function notifyNewCustomerEmail(
  data:NotifyNewCustomerEmailInput,
){
  if(!Types.ObjectId.isValid(data.userId)){
    throw new Error("Invalid user ID.");
  }

  const user=await UserModel
    .findById(data.userId)
    .select("email activeEmailProvider")
    .lean();

  if(!user){
    throw new Error("User not found.");
  }

  const notification=await Notification.create({
    userId:new Types.ObjectId(data.userId),
    type:"new_customer_email",
    title:"New customer message",
    message:data.subject||"You have a new customer message.",
    emailId:new Types.ObjectId(data.emailId),
    read:false,
  });

  const provider=data.provider;
  const userEmail=normalizeEmail(user.email??"");

  const account=await connectedAccountRepository.findByProvider(
    data.userId,
    provider,
  );

  const accountEmail=normalizeEmail(account?.email??"");

  if(userEmail&&accountEmail&&userEmail===accountEmail){
    console.warn(
      "Email notification skipped because the notification recipient is the connected support inbox:",
      {
        userId:data.userId,
        provider,
        email:userEmail,
      },
    );
    return notification;
  }

  if(!userEmail){
    console.warn(
      "Email notification skipped because the user has no email address:",
      {
        userId:data.userId,
      },
    );
    return notification;
  }

  try{
    await sendEmail({
      userId:data.userId,
      provider,
      to:userEmail,
      subject:`New customer message: ${data.subject}`,
      reply:[
        "You have a new customer message in your support inbox.",
        "",
        `From: ${data.from}`,
        `Subject: ${data.subject}`,
        "",
        data.preview,
        "",
        "Open your AI Customer Support Automation dashboard to review the conversation.",
      ].join("\n"),
    });
  }catch(error){
    console.error(
      "Email notification failed:",
      {
        userId:data.userId,
        provider,
        recipient:userEmail,
        error:error instanceof Error?error.message:error,
      },
    );
  }

  return notification;
}
