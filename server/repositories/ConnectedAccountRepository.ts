import { Types } from "mongoose";
import ConnectedAccount, {
  type ConnectedAccountDocument,
} from "../models/ConnectedAccount.js";

class ConnectedAccountRepository {
  findAll() {
    return ConnectedAccount
      .find()
      .sort({ createdAt: -1 });
  }

  findById(id: string) {
    return ConnectedAccount
      .findById(id);
  }

  findByUser(
    userId: string
  ) {
    return ConnectedAccount
      .find({
        userId:
          new Types.ObjectId(userId),
      })
      .sort({ createdAt: -1 });
  }

  findByProvider(
    userId: string,
    provider:
      | "gmail"
      | "outlook"
  ) {
    return ConnectedAccount
      .findOne({
        userId:
          new Types.ObjectId(userId),
        provider,
      });
  }

  findOne(
    userId: string,
    provider:
      | "gmail"
      | "outlook"
  ) {
    return ConnectedAccount
      .findOne({
        userId:
          new Types.ObjectId(userId),
        provider,
      });
  }

  findConnected() {
    return ConnectedAccount
      .find({
        connected: true,
      })
      .sort({
        lastSyncAt: 1,
      });
  }

  create(
    data: Partial<ConnectedAccountDocument>
  ) {
    return ConnectedAccount
      .create(data);
  }

  upsert(
    data: Partial<ConnectedAccountDocument>
  ) {
    return ConnectedAccount
      .findOneAndUpdate(
        {
          userId: data.userId,
          provider: data.provider,
        },
        {
          $set: data,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      );
  }

  update(
    id: string,
    data: Partial<ConnectedAccountDocument>
  ) {
    return ConnectedAccount
      .findByIdAndUpdate(
        id,
        {
          $set: data,
        },
        {
          new: true,
          runValidators: true,
        }
      );
  }

  delete(
    id: string
  ) {
    return ConnectedAccount
      .findByIdAndDelete(id);
  }

  remove(
    userId: string,
    provider:
      | "gmail"
      | "outlook"
  ) {
    return ConnectedAccount
      .findOneAndDelete({
        userId:
          new Types.ObjectId(userId),
        provider,
      });
  }

  countByUser(
    userId: string
  ) {
    return ConnectedAccount
      .countDocuments({
        userId:
          new Types.ObjectId(userId),
      });
  }
}

export const connectedAccountRepository =
  new ConnectedAccountRepository();
