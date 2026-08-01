import { google } from "googleapis";
import { env } from "./env.js";

export const gmailOAuth = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_CALLBACK_URL
);

export const gmail = google.gmail({
  version: "v1",
  auth: gmailOAuth,
});
