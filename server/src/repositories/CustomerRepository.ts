import { Types } from "mongoose";
import CustomerModel from "../models/Customer.js";

type CustomerData = {
  userId: string;
  email: string;
  name?: string;
  company?: string;
  crmId?: string;
  status?: "active" | "inactive" | "at_risk" | "vip" | "blocked";
  tags?: string[];
  notes?: string;
};

type CustomerUpdate = {
  email?: string;
  name?: string;
  company?: string;
  crmId?: string;
  status?: "active" | "inactive" | "at_risk" | "vip" | "blocked";
  tags?: string[];
  notes?: string;
};

export const customerRepository = {
  findAll(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return [];
    return CustomerModel.find({ userId: new Types.ObjectId(userId) }).sort({ updatedAt: -1 });
  },

  findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return CustomerModel.findById(id);
  },

  findByEmail(userId: string, email: string) {
    if (!Types.ObjectId.isValid(userId)) return null;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return null;
    return CustomerModel.findOne({
      userId: new Types.ObjectId(userId),
      email: normalizedEmail,
    });
  },

  findByCrmId(userId: string, crmId: string) {
    if (!Types.ObjectId.isValid(userId)) return null;
    const normalizedCrmId = crmId.trim();
    if (!normalizedCrmId) return null;
    return CustomerModel.findOne({
      userId: new Types.ObjectId(userId),
      crmId: normalizedCrmId,
    });
  },

  create(data: CustomerData) {
    return CustomerModel.create({
      userId: new Types.ObjectId(data.userId),
      email: data.email.trim().toLowerCase(),
      name: data.name?.trim() ?? "",
      company: data.company?.trim() ?? "",
      crmId: data.crmId?.trim() ?? "",
      status: data.status ?? "active",
      tags: data.tags?.map((tag) => tag.trim()).filter(Boolean).slice(0, 50) ?? [],
      notes: data.notes?.trim() ?? "",
    });
  },

  async findOrCreate(data: CustomerData) {
    const normalizedEmail = data.email.trim().toLowerCase();
    if (!Types.ObjectId.isValid(data.userId) || !normalizedEmail) return null;
    const existingCustomer = await this.findByEmail(data.userId, normalizedEmail);
    if (existingCustomer) {
      if (data.name?.trim() && !existingCustomer.name) {
        existingCustomer.name = data.name.trim();
        await existingCustomer.save();
      }
      return existingCustomer;
    }
    try {
      return await this.create({ ...data, email: normalizedEmail });
    } catch (error: unknown) {
      if ((error as { code?: number })?.code === 11000) {
        return this.findByEmail(data.userId, normalizedEmail);
      }
      throw error;
    }
  },

  update(id: string, data: CustomerUpdate) {
    if (!Types.ObjectId.isValid(id)) return null;
    const update: CustomerUpdate = {};
    if (data.email !== undefined) update.email = data.email.trim().toLowerCase();
    if (data.name !== undefined) update.name = data.name.trim();
    if (data.company !== undefined) update.company = data.company.trim();
    if (data.crmId !== undefined) update.crmId = data.crmId.trim();
    if (data.status !== undefined) update.status = data.status;
    if (data.tags !== undefined) update.tags = data.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 50);
    if (data.notes !== undefined) update.notes = data.notes.trim();
    return CustomerModel.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
  },

  delete(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return CustomerModel.findByIdAndDelete(id);
  },

  addConversationHistory(id: string, entry: {
    emailId?: Types.ObjectId;
    threadId?: string;
    subject?: string;
    category?: string;
    sentiment?: "positive" | "neutral" | "negative" | "urgent";
    summary?: string;
    lastMessageAt?: Date;
  }) {
    if (!Types.ObjectId.isValid(id)) return null;
    return CustomerModel.findByIdAndUpdate(
      id,
      { $push: { conversationHistory: { ...entry, category: entry.category ?? "general_support", sentiment: entry.sentiment ?? "neutral" } } },
      { new: true, runValidators: true }
    );
  },

  addSupportHistory(id: string, entry: {
    emailId?: Types.ObjectId;
    draftId?: Types.ObjectId;
    action: "replied" | "approved" | "rejected" | "escalated" | "blocked";
    category?: string;
    confidence?: number;
    summary?: string;
  }) {
    if (!Types.ObjectId.isValid(id)) return null;
    return CustomerModel.findByIdAndUpdate(
      id,
      { $push: { supportHistory: { ...entry, category: entry.category ?? "general_support", createdAt: new Date() } } },
      { new: true, runValidators: true }
    );
  },
};
