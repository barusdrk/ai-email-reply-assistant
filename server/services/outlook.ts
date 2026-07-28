import {
  Client,
} from "@microsoft/microsoft-graph-client";

import {
  ConfidentialClientApplication,
} from "@azure/msal-node";

import { outlookConfig } from "../config/outlook.js";

const msal =
new ConfidentialClientApplication(
  outlookConfig
);

async function accessToken() {
  const result =
    await msal.acquireTokenByClientCredential(
      {
        scopes: [
          "https://graph.microsoft.com/.default",
        ],
      }
    );

  if (!result?.accessToken) {
    throw new Error(
      "Unable to acquire Outlook token."
    );
  }

  return result.accessToken;
}

async function graph() {
  const token =
    await accessToken();

  return Client.init({
    authProvider: {
      getAccessToken: async () => token,
    },
  });
}

export async function listEmails() {
  const client =
    await graph();

  const response =
    await client
      .api("/me/messages")
      .top(25)
      .orderby("receivedDateTime DESC")
      .get();

  return response.value ?? [];
}

export async function getEmail(
  id: string
) {
  const client =
    await graph();

  return client
    .api(`/me/messages/${id}`)
    .get();
}

export async function sendEmail(
  message: unknown
) {
  const client =
    await graph();

  return client
    .api("/me/sendMail")
    .post({
      message,
      saveToSentItems: true,
    });
}

export async function replyEmail(
  id: string,
  comment: string
) {
  const client =
    await graph();

  return client
    .api(`/me/messages/${id}/reply`)
    .post({
      comment,
    });
}
