import { Types } from "mongoose";
import OrderModel from "../models/Order.js";

export const orderRepository = {
  findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return OrderModel.findById(id).populate("customerId");
  },

  findByOrderNumber(userId: string, orderNumber: string) {
    if (!Types.ObjectId.isValid(userId)) return null;
    return OrderModel.findOne({
      userId: new Types.ObjectId(userId),
      orderNumber: orderNumber.trim(),
    }).populate("customerId");
  },

  findByCustomer(userId: string, customerId: string) {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(customerId)) return null;
    return OrderModel.find({
      userId: new Types.ObjectId(userId),
      customerId: new Types.ObjectId(customerId),
    }).sort({ orderedAt: -1 });
  },

  create(data: {
    userId: string;
    customerId: string;
    orderNumber: string;
    status?: string;
    items?: { name: string; quantity: number; price: number }[];
    total: number;
    currency?: string;
    paymentStatus?: string;
    fulfillmentStatus?: string;
    trackingNumber?: string;
    estimatedDelivery?: Date | null;
    orderedAt?: Date;
  }) {
    return OrderModel.create({
      userId: new Types.ObjectId(data.userId),
      customerId: new Types.ObjectId(data.customerId),
      orderNumber: data.orderNumber.trim(),
      status: data.status,
      items: data.items ?? [],
      total: data.total,
      currency: data.currency?.trim().toUpperCase() ?? "USD",
      paymentStatus: data.paymentStatus,
      fulfillmentStatus: data.fulfillmentStatus,
      trackingNumber: data.trackingNumber?.trim() ?? "",
      estimatedDelivery: data.estimatedDelivery ?? null,
      orderedAt: data.orderedAt ?? new Date(),
    });
  },

  update(id: string, data: {
    status?: string;
    items?: { name: string; quantity: number; price: number }[];
    total?: number;
    currency?: string;
    paymentStatus?: string;
    fulfillmentStatus?: string;
    trackingNumber?: string;
    estimatedDelivery?: Date | null;
  }) {
    if (!Types.ObjectId.isValid(id)) return null;

    const update: Record<string, unknown> = {};

    if (data.status !== undefined) update.status = data.status;
    if (data.items !== undefined) update.items = data.items;
    if (data.total !== undefined) update.total = data.total;
    if (data.currency !== undefined) update.currency = data.currency.trim().toUpperCase();
    if (data.paymentStatus !== undefined) update.paymentStatus = data.paymentStatus;
    if (data.fulfillmentStatus !== undefined) update.fulfillmentStatus = data.fulfillmentStatus;
    if (data.trackingNumber !== undefined) update.trackingNumber = data.trackingNumber.trim();
    if (data.estimatedDelivery !== undefined) update.estimatedDelivery = data.estimatedDelivery;

    return OrderModel.findByIdAndUpdate(id, { $set: update }, { new: true }).populate("customerId");
  },

  delete(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return OrderModel.findByIdAndDelete(id);
  },
};
