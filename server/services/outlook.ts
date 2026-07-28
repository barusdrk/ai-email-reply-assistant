import { Client } from "@microsoft/microsoft-graph-client";
import { outlookClient } from "../config/outlook";

let accessToken = "";

export function getMicrosoftAuthUrl() {
  return {
    url: outlookClient.getAuthCodeUrl({
      scopes: [
        "User.Read",
        "Mail.Read",
        "Mail.Send",
        "offline_access",
      ],
      redirectUri: process.env.OUTLOOK_REDIRECT_URI!,
    }),
  };
}

export async function exchangeCode(code: string) {
  const result = await outlookClient.acquireTokenByCode({
    code,
    scopes: ["Mail.Read", "Mail.Send"],
    redirectUri: process.env.OUTLOOK_REDIRECT_URI!,
  });

  accessToken = result?.accessToken ?? "";

  return result;
}

function graph() {
  return Client.init({
    authProvider: done => done(null, accessToken),
  });
}

export async function listEmails() {
  const result = await graph().api("/me/messages").top(25).get();
  return result.value;
}

export async function sendEmail(to: string, subject: string, body: string) {
  await graph().api("/me/sendMail").post({
    message: {
      subject,
      body: {
        contentType: "HTML",
        content: body,
      },
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
    },
  });

  return true;
}

export async function connectionStatus() {
  return {
    connected: accessToken.length > 0,
  };
}

export async function disconnectAccount() {
  accessToken = "";
  return true;
}
