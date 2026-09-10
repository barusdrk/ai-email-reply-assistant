import { Schema, model, type InferSchemaType } from "mongoose";

const orderStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"] as const;
const paymentStatuses = ["pending", "paid", "failed", "refunded"] as const;
const fulfillmentStatuses = ["unfulfilled", "processing", "fulfilled", "partially_fulfilled"] as const;

const orderItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    orderNumber: { type: String, required: true, trim: true },
    status: { type: String, enum: orderStatuses, default: "pending" },
    items: { type: [orderItemSchema], default: [] },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD", trim: true, uppercase: true },
    paymentStatus: { type: String, enum: paymentStatuses, default: "pending" },
    fulfillmentStatus: { type: String, enum: fulfillmentStatuses, default: "unfulfilled" },
    trackingNumber: { type: String, default: "", trim: true },
    estimatedDelivery: { type: Date, default: null },
    orderedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ userId: 1, customerId: 1, orderedAt: -1 });

export type OrderDocument = InferSchemaType<typeof orderSchema>;
export const OrderModel = model("Order", orderSchema);
export default OrderModel;
