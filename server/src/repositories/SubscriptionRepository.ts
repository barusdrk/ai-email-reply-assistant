import { Types } from "mongoose";
import SubscriptionModel, {
  type SubscriptionDocument,
} from "../models/Subscription.js";

class SubscriptionRepository {
  findByUser(userId: string) {
    return SubscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
    });
  }

  create(data: Partial<SubscriptionDocument>) {
    return SubscriptionModel.create(data);
  }

  update(
    userId: string,
    data: Partial<SubscriptionDocument>
  ) {
    return SubscriptionModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
      },
      {
        $set: data,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  updateBySubscriptionId(
    subscriptionId: string,
    data: Partial<SubscriptionDocument>
  ) {
    return SubscriptionModel.findOneAndUpdate(
      {
        subscriptionId,
      },
      {
        $set: data,
      },
      {
        new: true,
      }
    );
  }

  delete(userId: string) {
    return SubscriptionModel.findOneAndDelete({
      userId: new Types.ObjectId(userId),
    });
  }
}

export const subscriptionRepository =
  new SubscriptionRepository();
