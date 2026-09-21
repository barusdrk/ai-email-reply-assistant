import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { decrypt } from "./encryption.js";
import { hubSpotAccountRepository } from "../repositories/HubSpotAccountRepository.js";

const HUBSPOT_AUTH_URL = "https://app.hubspot.com/oauth/authorize";
const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/2026-03/token";
const HUBSPOT_API_URL = "https://api.hubapi.com";

const HUBSPOT_SCOPES = [
  "crm.objects.contacts.read",
  "crm.objects.companies.read",
];

type OAuthState = {
  userId: string;
  nonce: string;
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  hub_id?: number;
};

type HubSpotResponse<T> = {
  results?: T[];
  id?: string;
  properties?: Record<string, unknown>;
  paging?: {
    next?: {
      after: string;
    };
  };
};

type HubSpotContact={
  id:string;
  properties?:{
    email?:string;
    firstname?:string;
    lastname?:string;
    company?:string;
    phone?:string;
    createdate?:string;
    lastmodifieddate?:string;
  };
  createdAt?:string;
  updatedAt?:string;
  archived?:boolean;
  url?:string;
};

type HubSpotCompany = {
  id: string;
  properties?: {
    name?: string;
    domain?: string;
    website?: string;
  };
};

function requireConfig() {
  if (!env.HUBSPOT_CLIENT_ID) {
    throw new Error("Missing HUBSPOT_CLIENT_ID.");
  }

  if (!env.HUBSPOT_CLIENT_SECRET) {
    throw new Error("Missing HUBSPOT_CLIENT_SECRET.");
  }

  if (!env.HUBSPOT_CALLBACK_URL) {
    throw new Error("Missing HUBSPOT_CALLBACK_URL.");
  }

  if (!env.TOKEN_ENCRYPTION_KEY) {
    throw new Error("Missing TOKEN_ENCRYPTION_KEY.");
  }
}

function createState(userId: string): string {
  requireConfig();

  const payload: OAuthState = {
    userId,
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "10m" });
}

function verifyState(state: string): OAuthState {
  const payload = jwt.verify(state, env.JWT_SECRET) as OAuthState;

  if (!payload.userId || !payload.nonce) {
    throw new Error("Invalid HubSpot OAuth state.");
  }

  return payload;
}

function getSafeResponseSummary(data: unknown) {
  if (!data || typeof data !== "object") {
    return data;
  }

  const value = data as Record<string, unknown>;

  return {
    id: typeof value.id === "string" ? value.id : undefined,
    resultCount: Array.isArray(value.results)
      ? value.results.length
      : undefined,
    results: Array.isArray(value.results)
      ? value.results.map((result) => {
          if (!result || typeof result !== "object") {
            return result;
          }

          const item = result as Record<string, unknown>;

          return {
            id:
              typeof item.id === "string"
                ? item.id
                : undefined,
            properties:
              item.properties &&
              typeof item.properties === "object"
                ? item.properties
                : undefined,
          };
        })
      : undefined,
    paging:
      value.paging &&
      typeof value.paging === "object"
        ? value.paging
        : undefined,
    message:
      typeof value.message === "string"
        ? value.message
        : undefined,
    error:
      typeof value.error === "string"
        ? value.error
        : undefined,
  };
}

export function getAuthorizationUrl(userId: string): string {
  requireConfig();

  const state = createState(userId);

  const params = new URLSearchParams({
    client_id: env.HUBSPOT_CLIENT_ID!,
    redirect_uri: env.HUBSPOT_CALLBACK_URL!,
    scope: HUBSPOT_SCOPES.join(" "),
    state,
  });

  return `${HUBSPOT_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  state: string
) {
  requireConfig();

  const payload = verifyState(state);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: env.HUBSPOT_CLIENT_ID!,
    client_secret: env.HUBSPOT_CLIENT_SECRET!,
    redirect_uri: env.HUBSPOT_CALLBACK_URL!,
    code,
  });

  const response = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = (await response.json()) as TokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.error_description ||
        data.error ||
        "Failed to exchange HubSpot authorization code."
    );
  }

  if (
    !data.access_token ||
    !data.refresh_token ||
    !data.hub_id
  ) {
    throw new Error(
      "HubSpot returned an incomplete OAuth token response."
    );
  }

  const expiresAt = new Date(
    Date.now() + data.expires_in * 1000
  );

  const existing =
    await hubSpotAccountRepository.findByUser(
      payload.userId
    );

  if (existing) {
    await hubSpotAccountRepository.updateTokens(
      payload.userId,
      {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
      }
    );
  } else {
    await hubSpotAccountRepository.create({
      userId: payload.userId,
      hubId: String(data.hub_id),
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    });
  }

  return {
    userId: payload.userId,
    hubId: String(data.hub_id),
  };
}

async function refreshAccessToken(
  userId: string
): Promise<string> {
  requireConfig();

  const account =
    await hubSpotAccountRepository.findByUser(userId);

  if (!account || !account.connected) {
    throw new Error("HubSpot is not connected.");
  }

  const refreshToken = decrypt(account.refreshToken);

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: env.HUBSPOT_CLIENT_ID!,
    client_secret: env.HUBSPOT_CLIENT_SECRET!,
    refresh_token: refreshToken,
  });

  const response = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = (await response.json()) as
    Partial<TokenResponse> & {
      error?: string;
      error_description?: string;
    };

  if (
    !response.ok ||
    !data.access_token ||
    !data.expires_in
  ) {
    throw new Error(
      data.error_description ||
        data.error ||
        "Failed to refresh HubSpot access token."
    );
  }

  const expiresAt = new Date(
    Date.now() + data.expires_in * 1000
  );

  await hubSpotAccountRepository.updateTokens(userId, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token
      ? data.refresh_token
      : refreshToken,
    expiresAt,
  });

  return data.access_token;
}

async function getAccessToken(
  userId: string
): Promise<string> {
  requireConfig();

  const account =
    await hubSpotAccountRepository.findByUser(userId);

  if (!account || !account.connected) {
    throw new Error("HubSpot is not connected.");
  }

  const expiresSoon =
    account.expiresAt.getTime() <=
    Date.now() + 60_000;

  if (expiresSoon) {
    return refreshAccessToken(userId);
  }

  return decrypt(account.accessToken);
}

async function hubSpotRequest<T>(
  userId: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let accessToken = await getAccessToken(userId);

  const method = options.method ?? "GET";

  console.log(
    `HubSpot API request: ${method} ${path}`
  );

  let response = await fetch(
    `${HUBSPOT_API_URL}${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    }
  );

  if (response.status === 401) {
    console.warn(
      `HubSpot API returned 401 for ${method} ${path}. Refreshing access token.`
    );

    accessToken = await refreshAccessToken(userId);

    response = await fetch(
      `${HUBSPOT_API_URL}${path}`,
      {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(options.headers ?? {}),
        },
      }
    );
  }

  const data = (await response.json()) as T & {
    message?: string;
    error?: string;
  };

  console.log(
    `HubSpot API response: ${response.status} ${method} ${path}`
  );

  if (
    path.includes("/contacts/search") ||
    path.includes("/companies/search")
  ) {
    console.log(
      "HubSpot API response summary:",
      JSON.stringify(
        getSafeResponseSummary(data),
        null,
        2
      )
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        `HubSpot API request failed with status ${response.status}.`
    );
  }

  return data;
}

export async function getHubSpotAccount(
  userId: string
) {
  const account =
    await hubSpotAccountRepository.findByUser(userId);

  if (!account || !account.connected) {
    return null;
  }

  return {
    hubId: account.hubId,
    connected: account.connected,
    connectedAt: account.connectedAt,
    expiresAt: account.expiresAt,
  };
}

export async function searchContactByEmail(userId:string,email:string){
  const normalizedEmail=email.trim().toLowerCase();
  if(!normalizedEmail)throw new Error("Customer email is required.");
  console.log(`HubSpot contact search: email=${normalizedEmail}`);
  const data=await hubSpotRequest<HubSpotResponse<HubSpotContact>>(userId,"/crm/v3/objects/contacts/search",{
    method:"POST",
    body:JSON.stringify({
      filterGroups:[{
        filters:[{
          propertyName:"email",
          operator:"EQ",
          value:normalizedEmail,
        }],
      }],
      properties:[
        "email",
        "firstname",
        "lastname",
        "company",
        "phone",
        "createdate",
        "lastmodifieddate",
      ],
      limit:1,
    }),
  });
  const contact=data.results?.[0]??null;
  console.log(`HubSpot contact search result: ${contact?`found contact ${contact.id}`:"no matching contact"}`);
  return contact;
}

export async function getContact(
  userId: string,
  contactId: string
) {
  return hubSpotRequest<HubSpotContact>(
    userId,
    `/crm/v3/objects/contacts/${encodeURIComponent(
      contactId
    )}?properties=email,firstname,lastname,company,phone`
  );
}

export async function searchCompanyByName(
  userId: string,
  name: string
) {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("Company name is required.");
  }

  console.log(
    `HubSpot company search: name=${normalizedName}`
  );

  const data = await hubSpotRequest<
    HubSpotResponse<HubSpotCompany>
  >(
    userId,
    "/crm/v3/objects/companies/search",
    {
      method: "POST",
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "name",
                operator: "EQ",
                value: normalizedName,
              },
            ],
          },
        ],
        properties: [
          "name",
          "domain",
          "website",
        ],
        limit: 1,
      }),
    }
  );

  const company = data.results?.[0] ?? null;

  console.log(
    `HubSpot company search result: ${
      company
        ? `found company ${company.id}`
        : "no matching company"
    }`
  );

  return company;
}

export async function disconnectHubSpot(
  userId: string
) {
  return hubSpotAccountRepository.disconnect(userId);
}

export function getHubSpotOAuthStateUserId(
  state: string
): string {
  return verifyState(state).userId;
}

export async function listContacts(userId: string) {
  const data = await hubSpotRequest<
    HubSpotResponse<HubSpotContact>
  >(
    userId,
    "/crm/v3/objects/contacts?limit=10&properties=email,firstname,lastname,company,phone"
  );

  console.log(
    "HubSpot contacts:",
    JSON.stringify(getSafeResponseSummary(data), null, 2)
  );

  return data.results ?? [];
}
