import crypto from "crypto";

// Public partner API keys. Format: ck_live_<random>. We store ONLY the sha256
// hash + a short prefix — the full key is shown once at issuance and never
// persisted in plaintext.
const KEY_PREFIX = "ck_live_";

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = crypto.randomBytes(24).toString("base64url");
  const key = `${KEY_PREFIX}${raw}`;
  return { key, prefix: key.slice(0, 12), hash: hashApiKey(key) };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}
