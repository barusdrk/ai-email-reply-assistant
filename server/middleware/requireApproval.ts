import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { approvalRepository }
from "../repositories/ApprovalRepository.js";

export async function requireApproval(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const approval =
    await approvalRepository.findByDraft(
      Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id
    );

  if (!approval) {
    return res.status(404).json({
      success: false,
      message:
        "Approval not found",
    });
  }

  if (approval.status !== "approved") {
    return res.status(403).json({
      success: false,
      message:
        "Draft has not been approved",
    });
  }

  next();
}
