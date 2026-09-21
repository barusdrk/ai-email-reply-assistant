import { Types } from "mongoose";
import HubSpotAccount, {
  type HubSpotAccountDocument,
} from "../models/HubSpotAccount.js";
import { encrypt } from "../services/encryption.js";

function toObjectId(userId: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }
  return new Types.ObjectId(userId);
}

export class HubSpotAccountRepository {
  async findByUser(userId: string): Promise<HubSpotAccountDocument | null> {
    return HubSpotAccount.findOne({ userId: toObjectId(userId) });
  }

  async findByHubId(hubId: string): Promise<HubSpotAccountDocument | null> {
    return HubSpotAccount.findOne({ hubId });
  }

  async create(data: {
    userId: string;
    hubId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }): Promise<HubSpotAccountDocument> {
    return HubSpotAccount.create({
      userId: toObjectId(data.userId),
      hubId: data.hubId,
      accessToken: encrypt(data.accessToken),
      refreshToken: encrypt(data.refreshToken),
      expiresAt: data.expiresAt,
      connected: true,
      connectedAt: new Date(),
    });
  }

  async updateTokens(
    userId: string,
    data: {
      accessToken: string;
      refreshToken?: string;
      expiresAt: Date;
    }
  ): Promise<HubSpotAccountDocument | null> {
    const update: Record<string, unknown> = {
      accessToken: encrypt(data.accessToken),
      expiresAt: data.expiresAt,
      connected: true,
    };

    if (data.refreshToken) {
      update.refreshToken = encrypt(data.refreshToken);
    }

    return HubSpotAccount.findOneAndUpdate(
      { userId: toObjectId(userId) },
      { $set: update },
      { new: true }
    );
  }

  async disconnect(userId: string): Promise<HubSpotAccountDocument | null> {
    return HubSpotAccount.findOneAndUpdate(
      { userId: toObjectId(userId) },
      { $set: { connected: false } },
      { new: true }
    );
  }

  async delete(userId: string): Promise<HubSpotAccountDocument | null> {
    return HubSpotAccount.findOneAndDelete({
      userId: toObjectId(userId),
    });
  }
}

export const hubSpotAccountRepository = new HubSpotAccountRepository();
