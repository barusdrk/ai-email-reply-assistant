
import "dotenv/config";
import mongoose, { Types } from "mongoose";
import EmailModel from "../models/Email.js";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("E2E email fixtures cannot run in production.");
  }
  if (process.env.E2E_ALLOW_DB_FIXTURES !== "true") {
    throw new Error("Set E2E_ALLOW_DB_FIXTURES=true to enable E2E database fixtures.");
  }
  const [operation, userId, emailId] = process.argv.slice(2);
  if (!Types.ObjectId.isValid(userId ?? "")) {
    throw new Error("A valid test user ID is required.");
  }
  if (operation !== "create" && operation !== "delete") {
    throw new Error("Usage: e2eEmailFixture.ts <create|delete> <userId> [emailId]");
  }

  await mongoose.connect(process.env.MONGODB_URI ?? "");
  try {
    if (operation === "create") {
      const uniqueId = new Types.ObjectId().toString();
      const email = await EmailModel.create({
        userId: new Types.ObjectId(userId),
        provider: "gmail",
        direction: "inbound",
        messageId: `e2e-${uniqueId}@example.test`,
        messageIdHeader: `<e2e-${uniqueId}@example.test>`,
        threadId: `e2e-thread-${uniqueId}`,
        subject: "E2E customer support request",
        from: "E2E Customer <customer@example.test>",
        senderName: "E2E Customer",
        senderEmail: "customer@example.test",
        recipientEmail: "support@example.test",
        preview: "Please help with my recent order.",
        body: "I need help checking the shipping status of my recent order. Please let me know the expected delivery date.",
        archived: false,
        receivedAt: new Date(),
      });
      console.log(JSON.stringify({ emailId: email._id.toString() }));
    } else {
      if (!Types.ObjectId.isValid(emailId ?? "")) {
        throw new Error("A valid email ID is required for deletion.");
      }
      const result = await EmailModel.deleteOne({
        _id: new Types.ObjectId(emailId),
        userId: new Types.ObjectId(userId),
        messageId: { $regex: /^e2e-/ },
      });
      console.log(JSON.stringify({ deleted: result.deletedCount === 1 }));
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
