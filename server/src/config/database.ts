import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("MongoDB connected.");
  console.log("MongoDB host:", mongoose.connection.host);
  console.log("MongoDB database:", mongoose.connection.name);
}
