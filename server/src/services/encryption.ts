import crypto from "crypto";
import { env } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const VERSION = "v1";

function getKey(): Buffer {
  const rawKey = env.TOKEN_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not configured.");
  }

  const key = Buffer.from(rawKey, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a 32-byte base64 key.");
  }

  return key;
}

export function encrypt(value: string): string {
  if (!value) {
    throw new Error("Cannot encrypt an empty value.");
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decrypt(value: string): string {
  if (!value) {
    throw new Error("Cannot decrypt an empty value.");
  }

  const parts = value.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted value format.");
  }

  const [version, ivBase64, authTagBase64, encryptedBase64] = parts;

  if (version !== VERSION) {
    throw new Error(`Unsupported encrypted value version: ${version}`);
  }

  try {
    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(authTagBase64, "base64");
    const encrypted = Buffer.from(encryptedBase64, "base64");

    if (iv.length !== IV_LENGTH) {
      throw new Error("Invalid initialization vector.");
    }

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error("Invalid authentication tag.");
    }

    if (!encrypted.length) {
      throw new Error("Encrypted value is empty.");
    }

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getKey(),
      iv
    );

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch {
    throw new Error("Failed to decrypt value.");
  }
}
