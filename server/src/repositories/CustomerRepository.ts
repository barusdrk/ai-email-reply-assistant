import { Types } from "mongoose";
import CustomerModel from "../models/Customer.js";

export const customerRepository = {
  findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return CustomerModel.findById(id);
  },

  findByEmail(userId: string, email: string) {
    if (!Types.ObjectId.isValid(userId)) return null;

    return CustomerModel.findOne({
      userId: new Types.ObjectId(userId),
      email: email.trim().toLowerCase(),
    });
  },

  create(data: { userId: string; email: string; name?: string }) {
    return CustomerModel.create({
      userId: new Types.ObjectId(data.userId),
      email: data.email.trim().toLowerCase(),
      name: data.name?.trim() ?? "",
    });
  },

  async findOrCreate(data: {
    userId: string;
    email: string;
    name?: string;
  }) {
    const existingCustomer = await this.findByEmail(
      data.userId,
      data.email
    );

    if (existingCustomer) {
      return existingCustomer;
    }

    return this.create(data);
  },

  update(id: string, data: { email?: string; name?: string }) {
    if (!Types.ObjectId.isValid(id)) return null;

    const update: { email?: string; name?: string } = {};

    if (data.email !== undefined) {
      update.email = data.email.trim().toLowerCase();
    }

    if (data.name !== undefined) {
      update.name = data.name.trim();
    }

    return CustomerModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );
  },

  delete(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return CustomerModel.findByIdAndDelete(id);
  },
};
