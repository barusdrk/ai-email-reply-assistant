import { Types } from "mongoose";
import { orderRepository } from "../repositories/OrderRepository.js";

export async function findCustomerOrders(userId: string, customerId: string) {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(customerId)) {
    throw new Error("Invalid user or customer ID.");
  }

  const orders = await orderRepository.findByCustomer(userId, customerId);

  if (!orders) {
    throw new Error("Unable to find customer orders.");
  }

  return orders;
}

export async function findOrderByNumber(userId: string, orderNumber: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  if (!orderNumber.trim()) {
    throw new Error("Order number is required.");
  }

  const order = await orderRepository.findByOrderNumber(
    userId,
    orderNumber
  );

  return order;
}

export async function lookupCustomerOrder(
  userId: string,
  customerId: string,
  orderNumber?: string
) {
  if (orderNumber?.trim()) {
    const order = await findOrderByNumber(userId, orderNumber);

    if (!order) {
      return {
        found: false,
        order: null,
        orders: [],
      };
    }

    if (order.customerId && order.customerId._id.toString() !== customerId) {
      return {
        found: false,
        order: null,
        orders: [],
      };
    }

    return {
      found: true,
      order,
      orders: [order],
    };
  }

  const orders = await findCustomerOrders(userId, customerId);

  return {
    found: orders.length > 0,
    order: orders[0] ?? null,
    orders,
  };
}
