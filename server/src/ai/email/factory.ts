import type { EmailProvider } from "./types.js";
import { GmailProvider } from "./gmail.js";
import { OutlookProvider } from "./outlook.js";

const providers: Record<
  "gmail" | "outlook",
  EmailProvider
> = {
  gmail: new GmailProvider(),
  outlook: new OutlookProvider(),
};

export function getEmailProvider(
  provider: "gmail" | "outlook"
): EmailProvider {
  return providers[provider];
}
