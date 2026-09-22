import { Types } from "mongoose";
import { customerRepository } from "../repositories/CustomerRepository.js";

type CustomerStatus = "active" | "inactive" | "at_risk" | "vip" | "blocked";

function isValidId(id: string) {
  return Types.ObjectId.isValid(id);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function customers(userId: string) {
  if (!isValidId(userId)) throw new Error("Invalid user ID.");
  return customerRepository.findAll(userId);
}

export async function customer(id: string, userId: string) {
  if (!isValidId(id) || !isValidId(userId)) return null;
  const item = await customerRepository.findById(id);
  if (!item || item.userId.toString() !== userId) return null;
  return item;
}

export async function findCustomer(userId: string, email: string) {
  if (!isValidId(userId)) throw new Error("Invalid user ID.");
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("Customer email is required.");
  return customerRepository.findByEmail(userId, normalizedEmail);
}

export async function findOrCreateCustomer(userId: string, email: string, name?: string) {
  if (!isValidId(userId)) throw new Error("Invalid user ID.");
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("Customer email is required.");
  return customerRepository.findOrCreate({
    userId,
    email: normalizedEmail,
    name,
  });
}

export async function createCustomer(
  userId: string,
  data: {
    name?: string;
    email: string;
    company?: string;
    crmId?: string;
    status?: CustomerStatus;
    tags?: string[];
    notes?: string;
  }
) {
  if (!isValidId(userId)) throw new Error("Invalid user ID.");
  const email = normalizeEmail(data.email);
  if (!email) throw new Error("Customer email is required.");
  const existing = await customerRepository.findByEmail(userId, email);
  if (existing) throw new Error("A customer with this email already exists.");
  return customerRepository.create({
    userId,
    email,
    name: data.name,
    company: data.company,
    crmId: data.crmId,
    status: data.status,
    tags: data.tags,
    notes: data.notes,
  });
}

export async function updateCustomer(
  userId: string,
  id: string,
  data: {
    name?: string;
    email?: string;
    company?: string;
    crmId?: string;
    status?: CustomerStatus;
    tags?: string[];
    notes?: string;
  }
) {
  if (!isValidId(userId) || !isValidId(id)) return null;
  const existing = await customerRepository.findById(id);
  if (!existing || existing.userId.toString() !== userId) return null;
  if (data.email !== undefined) {
    const email = normalizeEmail(data.email);
    if (!email) throw new Error("Customer email is required.");
    const duplicate = await customerRepository.findByEmail(userId, email);
    if (duplicate && duplicate._id.toString() !== id) {
      throw new Error("A customer with this email already exists.");
    }
  }
  return customerRepository.update(id, {
    email: data.email,
    name: data.name,
    company: data.company,
    crmId: data.crmId,
    status: data.status,
    tags: data.tags,
    notes: data.notes,
  });
}

export async function deleteCustomer(userId: string, id: string) {
  if (!isValidId(userId) || !isValidId(id)) return null;
  const existing = await customerRepository.findById(id);
  if (!existing || existing.userId.toString() !== userId) return null;
  return customerRepository.delete(id);
}

export async function recordSupportHistory(
  userId: string,
  id: string,
  entry: {
    emailId?: Types.ObjectId;
    draftId?: Types.ObjectId;
    action: "replied" | "approved" | "rejected" | "escalated" | "blocked";
    category?: string;
    confidence?: number;
    summary?: string;
  }
) {
  if (!isValidId(userId) || !isValidId(id)) return null;
  const existing = await customerRepository.findById(id);
  if (!existing || existing.userId.toString() !== userId) return null;
  return customerRepository.addSupportHistory(id, {
    emailId: entry.emailId,
    draftId: entry.draftId,
    action: entry.action,
    category: entry.category,
    confidence: entry.confidence,
    summary: entry.summary,
  });
}
