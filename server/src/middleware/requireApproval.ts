import { Request, Response, NextFunction } from "express";
import { approvalRepository } from "../repositories/ApprovalRepository.js";

export async function requireApproval(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const draftId =
    (req.params.draftId ??
      req.body.draftId) as string | undefined;

  if (!draftId) {
    return res.status(400).json({
      message: "Draft ID is required",
    });
  }

  const approval =
    await approvalRepository.findPendingByDraft(
      draftId
    );

  if (!approval) {
    return res.status(404).json({
      message: "Pending approval not found",
    });
  }

  (req as any).approval = approval;

  next();
}
