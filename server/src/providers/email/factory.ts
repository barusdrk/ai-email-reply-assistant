import { GmailProvider } from "./gmail.js";
import { OutlookProvider } from "./outlook.js";
import type { EmailProvider } from "./types.js";

export type EmailProviderName =
  | "gmail"
  | "outlook";

export function createEmailProvider(
  provider: EmailProviderName
): EmailProvider {
  switch (provider) {
    case "gmail":
      return new GmailProvider();

    case "outlook":
      return new OutlookProvider();

    default:
      throw new Error(
        `Unsupported email provider: ${provider}`
      );
  }
}
