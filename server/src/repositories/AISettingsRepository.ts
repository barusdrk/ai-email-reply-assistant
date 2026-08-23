import { Types } from "mongoose";
import AISettingsModel, {
  type AISettingsDocument,
} from "../models/AISettings.js";

class AISettingsRepository {
  findByUser(userId: string) {
    return AISettingsModel.findOne({
      userId: new Types.ObjectId(userId),
    });
  }

  create(data: Partial<AISettingsDocument>) {
    return AISettingsModel.create(data);
  }

  update(
    userId: string,
    data: Partial<AISettingsDocument>
  ) {
    return AISettingsModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
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

  delete(userId: string) {
    return AISettingsModel.findOneAndDelete({
      userId: new Types.ObjectId(userId),
    });
  }
}

export const aiSettingsRepository =
  new AISettingsRepository();
