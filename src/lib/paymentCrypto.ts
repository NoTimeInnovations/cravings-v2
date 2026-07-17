// SERVER-ONLY. Encrypt/decrypt partner payment secrets (Razorpay key_secret /
// webhook_secret) so the DB only ever holds ciphertext. NEVER import this from a
// client component — it reads a server-only master key and runs Node crypto.
//
// Key: RZP_CREDS_MASTER_KEY (a long random secret, e.g. `openssl rand -hex 32`),
// set ONCE in Vercel env, WITHOUT the NEXT_PUBLIC_ prefix so it never reaches the
// browser bundle. A 32-byte AES key is derived from it via SHA-256.
//
// Format: "v1.<iv_b64>.<tag_b64>.<ciphertext_b64>" — AES-256-GCM with a random
// 96-bit IV per record and the auth tag stored alongside (tamper-evident).
import crypto from "crypto";

const ALGO = "aes-256-gcm";

function masterKey(): Buffer {
  const secret = process.env.RZP_CREDS_MASTER_KEY;
  if (!secret || secret.trim().length === 0) {
    throw new Error("RZP_CREDS_MASTER_KEY is not set");
  }
  // Derive a deterministic 32-byte key from the master secret (accepts any
  // high-entropy string). Use a long random secret so the derived key is strong.
  return crypto.createHash("sha256").update(secret.trim(), "utf8").digest();
}

/** True when a master key is configured (so callers can fail loud on misconfig). */
export function paymentCryptoConfigured(): boolean {
  const s = process.env.RZP_CREDS_MASTER_KEY;
  return !!s && s.trim().length > 0;
}

// `aad` (additional authenticated data — e.g. the partner id) is authenticated but
// not encrypted: decryption fails unless the SAME aad is supplied. Binding creds to
// their partner id this way stops a ciphertext being transplanted into another
// partner's row (which matters here because the browser holds a Hasura admin
// secret and could write the creds table directly).
export function encryptSecret(plaintext: string, aad?: string): string {
  if (plaintext == null) throw new Error("encryptSecret: plaintext required");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, masterKey(), iv);
  if (aad) cipher.setAAD(Buffer.from(aad, "utf8"));
  const ct = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64")}.${tag.toString("base64")}.${ct.toString("base64")}`;
}

export function decryptSecret(payload: string, aad?: string): string {
  const parts = (payload || "").split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("decryptSecret: malformed payload");
  }
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const ct = Buffer.from(parts[3], "base64");
  const decipher = crypto.createDecipheriv(ALGO, masterKey(), iv);
  if (aad) decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/** Non-throwing decrypt — returns null on missing/corrupt/tampered/wrong-aad payload. */
export function tryDecryptSecret(payload: string | null | undefined, aad?: string): string | null {
  try {
    return payload ? decryptSecret(payload, aad) : null;
  } catch {
    return null;
  }
}
