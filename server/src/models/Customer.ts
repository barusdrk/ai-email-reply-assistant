import { Schema, model, type InferSchemaType } from "mongoose";

const customerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

customerSchema.index({ userId: 1, email: 1 }, { unique: true });

export type CustomerDocument = InferSchemaType<typeof customerSchema>;
export const CustomerModel = model("Customer", customerSchema);
export default CustomerModel;
