import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { connectedAccountRepository }
from "../repositories/ConnectedAccountRepository.js";

export async function requireConnectedAccount(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const accounts =
    await connectedAccountRepository.findByUser(
      req.user!.id
    );

  if (accounts.length === 0) {
    return res.status(400).json({
      success: false,
      message:
        "No email account connected",
    });
  }

  next();
}
