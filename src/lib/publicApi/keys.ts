import crypto from "crypto";

// Public partner API keys. Format: ck_live_<32 alphanumeric>. We store ONLY the
// sha256 hash + a short prefix — the full key is shown once at issuance and
// never persisted in plaintext.
const KEY_PREFIX = "ck_live_";
const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// Alphanumeric only (no -, _, +, /) so keys are clean to copy/paste and never
// start with a symbol. 32 chars over a 62-char alphabet ≈ 190 bits of entropy.
export function randomAlnum(len: number): string {
  let out = "";
  while (out.length < len) {
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < bytes.length && out.length < len; i++) {
      const b = bytes[i];
      if (b < 248) out += ALPHABET[b % 62]; // 248 = 62*4 → rejects the biased tail
    }
  }
  return out;
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `${KEY_PREFIX}${randomAlnum(32)}`;
  return { key, prefix: key.slice(0, 12), hash: hashApiKey(key) };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}
