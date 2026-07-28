import mongoose from "mongoose";
import { env } from "./env";

export async function connectDatabase() {
  await mongoose.connect(env.MONGODB_URI!);

  console.log("MongoDB connected.");
}
