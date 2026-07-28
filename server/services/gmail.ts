import { google } from "googleapis";
import { env } from "../config/env";

const oauth = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_CALLBACK_URL
);

export function getGoogleAuthUrl() {
  return {
    url: oauth.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.compose",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      prompt: "consent",
    }),
  };
}

export async function exchangeCode(code: string) {
  const { tokens } = await oauth.getToken(code);

  oauth.setCredentials(tokens);

  return tokens;
}

export async function connectionStatus() {
  return {
    connected: !!oauth.credentials.access_token,
  };
}

export async function disconnectAccount() {
  oauth.setCredentials({});
  return true;
}

export async function listEmails(maxResults = 20) {
  const gmail = google.gmail({
    version: "v1",
    auth: oauth,
  });

  const { data } = await gmail.users.messages.list({
    userId: "me",
    maxResults,
  });

  return data.messages ?? [];
}
