import { ConfidentialClientApplication } from "@azure/msal-node";
import { env } from "./env";

export const outlookClient =
  new ConfidentialClientApplication({
    auth: {
      clientId: env.MICROSOFT_CLIENT_ID!,
      clientSecret: env.MICROSOFT_CLIENT_SECRET!,
      authority:
        "https://login.microsoftonline.com/common",
    },
  });
