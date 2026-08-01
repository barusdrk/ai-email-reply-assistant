import crypto from "crypto";

const algorithm = "aes-256-cbc";

const key = Buffer.from(
  process.env.ENCRYPTION_KEY ?? "",
  "hex"
);

export function encrypt(
  value:string
) {
  const iv = crypto.randomBytes(16);

  const cipher =
    crypto.createCipheriv(
      algorithm,
      key,
      iv
    );

  const encrypted =
    Buffer.concat([
      cipher.update(value),
      cipher.final(),
    ]);

  return [
    iv.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decrypt(
  value:string
) {
  const [
    ivHex,
    encryptedHex,
  ] = value.split(":");

  const decipher =
    crypto.createDecipheriv(
      algorithm,
      key,
      Buffer.from(
        ivHex,
        "hex"
      )
    );

  const decrypted =
    Buffer.concat([
      decipher.update(
        Buffer.from(
          encryptedHex,
          "hex"
        )
      ),
      decipher.final(),
    ]);

  return decrypted.toString();
}
