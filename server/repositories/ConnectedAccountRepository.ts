import ConnectedAccount from "../models/ConnectedAccount.js";

class ConnectedAccountRepository {
  findByUser(userId: string) {
    return ConnectedAccount.find({
      userId,
      connected: true,
    }).lean();
  }

  findById(id: string) {
    return ConnectedAccount.findById(id).lean();
  }

  findConnected() {
    return ConnectedAccount.find({
      connected: true,
    }).lean();
  }

  findByProviderUserId(
    provider: "gmail" | "outlook",
    providerUserId: string
  ) {
    return ConnectedAccount.findOne({
      provider,
      providerUserId,
    }).lean();
  }

  create(data: any) {
    return ConnectedAccount.create(data);
  }


  update(id: string, data: any) {
    return ConnectedAccount.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        lean: true,
      }
    );
  }

  disconnect(id: string) {
    return ConnectedAccount.findByIdAndUpdate(
      id,
      {
        connected: false,
      },
      {
        new: true,
        lean: true,
      }
    );
  }

  async clearExpiredTokens() {
    const now = new Date();

    return ConnectedAccount.updateMany(
      {
        expiryDate: { $lt: now },
        connected: true,
      },
      {
        $set: {
          syncStatus: "error",
          lastError: "Access token expired",
        },
      }
    );
  }

  delete(id: string) {
    return ConnectedAccount.findByIdAndDelete(id);
  }
}

export const connectedAccountRepository =
  new ConnectedAccountRepository();
