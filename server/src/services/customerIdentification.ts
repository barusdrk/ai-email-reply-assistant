import { Types } from "mongoose";
import EmailModel from "../models/Email.js";
import { customerRepository } from "../repositories/CustomerRepository.js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function identifyCustomer(emailId: string, userId: string) {
  if (
    !Types.ObjectId.isValid(emailId) ||
    !Types.ObjectId.isValid(userId)
  ) {
    throw new Error("Invalid email or user ID.");
  }

  const email = await EmailModel.findOne({
    _id: new Types.ObjectId(emailId),
    userId: new Types.ObjectId(userId),
  }).lean();

  if (!email) {
    throw new Error("Email not found.");
  }

  const senderEmail = normalizeEmail(
    (email.senderEmail || email.from.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    )?.[0]) ?? ""
  );

  if (!senderEmail) {
    return {
      matched: false,
      customerId: null,
      customer: null,
    };
  }

  const customer = await customerRepository.findOrCreate({
    userId,
    email: senderEmail,
    name: email.senderName,
  });

  await EmailModel.updateOne(
    {
      _id: email._id,
      userId: email.userId,
    },
    {
      $set: {
        customerId: customer._id,
      },
    }
  );

  return {
    matched: true,
    customerId: customer._id.toString(),
    customer,
  };
}
