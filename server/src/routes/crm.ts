import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  customers,
  customer,
  recordSupportHistory,
} from "../services/crm.js";
import {
  exchangeCodeForTokens,
  getAuthorizationUrl,
  getHubSpotAccount,
  disconnectHubSpot,
  getHubSpotOAuthStateUserId,
  searchContactByEmail,
  getContact,
  searchCompanyByName,
} from "../services/hubspot.js";
import { env } from "../config/env.js";

const router = Router();

function getUserId(req: Request): string | null {
  const user = (req as Request & { user?: { id?: string } }).user;
  return typeof user?.id === "string" && user.id.trim() ? user.id : null;
}

function getRouteId(req: Request): string | null {
  const id = req.params.id;
  return typeof id === "string" && id.trim() ? id : null;
}

/**
 * HubSpot OAuth callback.
 * This route must remain outside authenticate because HubSpot
 * redirects the user's browser here without the application's
 * Bearer token.
 */
router.get("/hubspot/callback", async (req: Request, res: Response) => {
  try {
    const code =
      typeof req.query.code === "string"
        ? req.query.code
        : "";

    const state =
      typeof req.query.state === "string"
        ? req.query.state
        : "";

    const error =
      typeof req.query.error === "string"
        ? req.query.error
        : "";

    if (error) {
      const description =
        typeof req.query.error_description === "string"
          ? req.query.error_description
          : "HubSpot authorization was cancelled or denied.";

      return res.status(400).send(
        `<!doctype html><html><head><meta charset="utf-8"><title>HubSpot Connection</title></head><body><h1>HubSpot connection failed</h1><p>${escapeHtml(description)}</p><p>You can close this window and return to the application.</p></body></html>`
      );
    }

    if (!code || !state) {
      return res.status(400).send(
        `<!doctype html><html><head><meta charset="utf-8"><title>HubSpot Connection</title></head><body><h1>HubSpot connection failed</h1><p>Missing OAuth authorization code or state.</p><p>You can close this window and return to the application.</p></body></html>`
      );
    }

    await exchangeCodeForTokens(code, state);

    const clientUrl = env.CLIENT_URL;

    return res.send(
      `<!doctype html><html><head><meta charset="utf-8"><title>HubSpot Connected</title></head><body><h1>HubSpot connected successfully</h1><p>Your HubSpot account is now connected.</p><script>if(window.opener){window.opener.postMessage({type:"hubspot-oauth-success"},"${clientUrl}");}setTimeout(()=>window.close(),1000);</script></body></html>`
    );
  } catch (error) {
    console.error("HubSpot OAuth callback failed:", error);

    return res.status(500).send(
      `<!doctype html><html><head><meta charset="utf-8"><title>HubSpot Connection</title></head><body><h1>HubSpot connection failed</h1><p>Unable to complete the HubSpot connection.</p><p>You can close this window and try again.</p></body></html>`
    );
  }
});

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

router.use(authenticate);

router.get("/hubspot/connect", (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const authorizationUrl = getAuthorizationUrl(userId);

    return res.json({
      authorizationUrl,
    });
  } catch (error) {
    console.error("Failed to create HubSpot authorization URL:", error);

    return res.status(500).json({
      message: "Failed to start HubSpot connection.",
    });
  }
});

router.get("/hubspot/status", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const account = await getHubSpotAccount(userId);

    return res.json({
      connected: Boolean(account),
      account,
    });
  } catch (error) {
    console.error("Failed to load HubSpot status:", error);

    return res.status(500).json({
      message: "Failed to load HubSpot status.",
    });
  }
});

router.post("/hubspot/disconnect", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const account = await disconnectHubSpot(userId);

    return res.json({
      success: true,
      connected: false,
      account: account
        ? {
            hubId: account.hubId,
            connected: account.connected,
            connectedAt: account.connectedAt,
            expiresAt: account.expiresAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to disconnect HubSpot:", error);

    return res.status(500).json({
      message: "Failed to disconnect HubSpot.",
    });
  }
});

router.get("/hubspot/contacts/search", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const email = typeof req.query.email === "string" ? req.query.email : "";

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    if (!email.trim()) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    const contact = await searchContactByEmail(userId, email);

    return res.json({
      contact,
    });
  } catch (error) {
    console.error("Failed to search HubSpot contact:", error);

    return res.status(500).json({
      message: "Failed to search HubSpot contact.",
    });
  }
});

router.get("/hubspot/contacts/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const contactId = getRouteId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    if (!contactId) {
      return res.status(400).json({
        message: "Invalid HubSpot contact ID.",
      });
    }

    const contact = await getContact(userId, contactId);

    return res.json({
      contact,
    });
  } catch (error) {
    console.error("Failed to load HubSpot contact:", error);

    return res.status(500).json({
      message: "Failed to load HubSpot contact.",
    });
  }
});

router.get("/hubspot/companies/search", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const name = typeof req.query.name === "string" ? req.query.name : "";

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    if (!name.trim()) {
      return res.status(400).json({
        message: "Company name is required.",
      });
    }

    const company = await searchCompanyByName(userId, name);

    return res.json({
      company,
    });
  } catch (error) {
    console.error("Failed to search HubSpot company:", error);

    return res.status(500).json({
      message: "Failed to search HubSpot company.",
    });
  }
});

router.get("/customers", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const result = await customers(userId);

    return res.json(result);
  } catch (error) {
    console.error("Failed to load CRM customers:", error);

    return res.status(500).json({
      message: "Failed to load customers.",
    });
  }
});

router.get("/customers/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const customerId = getRouteId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    if (!customerId) {
      return res.status(400).json({
        message: "Invalid customer ID.",
      });
    }

    const result = await customer(customerId, userId);

    if (!result) {
      return res.status(404).json({
        message: "Customer not found.",
      });
    }

    return res.json(result);
  } catch (error) {
    console.error("Failed to load CRM customer:", error);

    return res.status(500).json({
      message: "Failed to load customer.",
    });
  }
});

router.post(
  "/customers/:id/support-history",
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const customerId = getRouteId(req);

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized." });
      }

      if (!customerId) {
        return res.status(400).json({
          message: "Invalid customer ID.",
        });
      }

      const {
        emailId,
        draftId,
        action,
        category,
        confidence,
        summary,
      } = req.body ?? {};

      if (
        ![
          "replied",
          "approved",
          "rejected",
          "escalated",
          "blocked",
        ].includes(action)
      ) {
        return res.status(400).json({
          message: "Invalid support history action.",
        });
      }

      const result = await recordSupportHistory(userId, customerId, {
        emailId,
        draftId,
        action,
        category,
        confidence,
        summary,
      });

      return res.status(201).json(result);
    } catch (error) {
      console.error("Failed to record CRM support history:", error);

      return res.status(500).json({
        message: "Failed to record support history.",
      });
    }
  }
);

export default router;
