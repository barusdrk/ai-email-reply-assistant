import {Types} from "mongoose";
import EmailModel from "../models/Email.js";
import DraftModel from "../models/Draft.js";
import ApprovalModel from "../models/Approval.js";

export interface DashboardStats {
  totalConversations: number;
  aiGeneratedReplies: number;
  automaticallyHandled: number;
  humanApprovals: number;
  escalations: number;
  blockedResponses: number;
  averageResponseTimeMinutes: number;
  aiConfidence: number;
  approvalRate: number;
  automationRate: number;
  supportVolume: {
    date: string;
    count: number;
  }[];
  topSupportCategories: {
    category: string;
    count: number;
  }[];
}

const SUPPORT_VOLUME_DAYS = 7;
const TOP_CATEGORY_LIMIT = 5;

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0,0,0,0);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0,10);
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  const userObjectId = new Types.ObjectId(userId);
  const today = startOfDay(new Date());
  const volumeStart = new Date(today);
  volumeStart.setDate(volumeStart.getDate() - (SUPPORT_VOLUME_DAYS - 1));

  const [
    conversationResult,
    aiGeneratedReplies,
    automaticallyHandled,
    humanApprovals,
    escalations,
    blockedResponses,
    confidenceResult,
    approvalResult,
    responseTimeResult,
    supportVolumeResult,
    categoryResult,
  ] = await Promise.all([
    EmailModel.aggregate([
      {
        $match: {
          userId: userObjectId,
        },
      },
      {
        $group: {
          _id: {
            $cond: [
              {$ne: ["$threadId", ""]},
              "$threadId",
              "$_id",
            ],
          },
        },
      },
      {
        $count: "total",
      },
    ]),
    DraftModel.countDocuments({
      userId: userObjectId,
    }),
    DraftModel.countDocuments({
      userId: userObjectId,
      status: "sent",
      automaticAction: "auto_approve",
    }),
    ApprovalModel.countDocuments({
      reviewerId: userObjectId,
      status: "approved",
    }),
    DraftModel.countDocuments({
      userId: userObjectId,
      automaticAction: "escalate",
    }),
    DraftModel.countDocuments({
      userId: userObjectId,
      automaticAction: "blocked",
    }),
    DraftModel.aggregate([
      {
        $match: {
          userId: userObjectId,
          "confidence.score": {
            $ne: null,
          },
        },
      },
      {
        $group: {
          _id: null,
          average: {
            $avg: "$confidence.score",
          },
        },
      },
    ]),
    ApprovalModel.aggregate([
      {
        $match: {
          reviewerId: userObjectId,
          status: {
            $in: ["approved","rejected"],
          },
        },
      },
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1,
          },
        },
      },
    ]),
    DraftModel.aggregate([
      {
        $match: {
          userId: userObjectId,
          status: "sent",
          sentAt: {
            $ne: null,
          },
        },
      },
      {
        $lookup: {
          from: "emails",
          localField: "emailId",
          foreignField: "_id",
          as: "email",
        },
      },
      {
        $unwind: "$email",
      },
      {
        $match: {
          "email.receivedAt": {
            $ne: null,
          },
        },
      },
      {
        $project: {
          responseTimeMinutes: {
            $divide: [
              {
                $subtract: [
                  "$sentAt",
                  "$email.receivedAt",
                ],
              },
              60000,
            ],
          },
        },
      },
      {
        $match: {
          responseTimeMinutes: {
            $gte: 0,
          },
        },
      },
      {
        $group: {
          _id: null,
          average: {
            $avg: "$responseTimeMinutes",
          },
        },
      },
    ]),
    EmailModel.aggregate([
      {
        $match: {
          userId: userObjectId,
          receivedAt: {
            $gte: volumeStart,
            $lt: new Date(today.getTime() + 86400000),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$receivedAt",
            },
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]),
    EmailModel.aggregate([
      {
        $match: {
          userId: userObjectId,
        },
      },
      {
        $group: {
          _id: {
            $ifNull: [
              "$classification.category",
              "other",
            ],
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
      {
        $limit: TOP_CATEGORY_LIMIT,
      },
    ]),
  ]);

  const totalConversations =
    conversationResult[0]?.total ?? 0;

  const averageConfidence =
    confidenceResult[0]?.average ?? 0;

  const averageResponseTime =
    responseTimeResult[0]?.average ?? 0;

  const approvedCount =
    approvalResult.find(
      (item:{_id:string;count:number}) =>
        item._id === "approved"
    )?.count ?? 0;

  const rejectedCount =
    approvalResult.find(
      (item:{_id:string;count:number}) =>
        item._id === "rejected"
    )?.count ?? 0;

  const reviewedApprovals =
    approvedCount + rejectedCount;

  const approvalRate =
    reviewedApprovals > 0
      ? (approvedCount / reviewedApprovals) * 100
      : 0;

  const automationRate =
    totalConversations > 0
      ? (automaticallyHandled / totalConversations) * 100
      : 0;

  const supportVolume = Array.from(
    {length: SUPPORT_VOLUME_DAYS},
    (_, index) => {
      const date = new Date(volumeStart);
      date.setDate(date.getDate() + index);

      const formattedDate = formatDate(date);

      const result = supportVolumeResult.find(
        (item:{_id:string;count:number}) =>
          item._id === formattedDate
      );

      return {
        date: formattedDate,
        count: result?.count ?? 0,
      };
    }
  );

  const topSupportCategories =
    categoryResult.map(
      (item:{_id:string;count:number}) => ({
        category: item._id,
        count: item.count,
      })
    );

  return {
    totalConversations,
    aiGeneratedReplies,
    automaticallyHandled,
    humanApprovals,
    escalations,
    blockedResponses,
    averageResponseTimeMinutes:
      Number(averageResponseTime.toFixed(1)),
    aiConfidence:
      Number(averageConfidence.toFixed(1)),
    approvalRate:
      Number(approvalRate.toFixed(1)),
    automationRate:
      Number(automationRate.toFixed(1)),
    supportVolume,
    topSupportCategories,
  };
}
