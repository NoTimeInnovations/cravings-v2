import crypto from "crypto";

// A short-lived, signed "order link" the welcome flow hands out. The token
// encodes an expiry + an HMAC over (partnerId, expiry), so the storefront can
// tell a fresh link from an expired one WITHOUT any DB state. After it expires
// the storefront shows a "send hi to get a new link" message.

const DEFAULT_TTL_MIN = 30;
const STOREFRONT_ORIGIN = "https://menuthere.com";

function secret(): string {
  return process.env.META_APP_SECRET || process.env.WHATSAPP_ACCESS_TOKEN || "menuthere-order-link";
}

function sign(partnerId: string, exp: number): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${partnerId}.${exp}`)
    .digest("hex")
    .slice(0, 24);
}

export function signOrderLinkToken(partnerId: string, ttlMinutes = DEFAULT_TTL_MIN): string {
  const exp = Date.now() + ttlMinutes * 60 * 1000;
  return Buffer.from(`${exp}.${sign(partnerId, exp)}`).toString("base64url");
}

export function verifyOrderLinkToken(
  partnerId: string,
  token: string,
): { valid: boolean; expired: boolean } {
  try {
    const [expStr, sig] = Buffer.from(token, "base64url").toString("utf8").split(".");
    const exp = Number(expStr);
    if (!exp || !sig) return { valid: false, expired: false };
    const expected = sign(partnerId, exp);
    if (sig.length !== expected.length) return { valid: false, expired: false };
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return { valid: false, expired: false };
    }
    if (Date.now() > exp) return { valid: false, expired: true };
    return { valid: true, expired: false };
  } catch {
    return { valid: false, expired: false };
  }
}

// Full ordering URL with a fresh 30-minute token, e.g.
// https://menuthere.com/oreodemo?olt=<token>
export function buildOrderLink(username: string, partnerId: string, ttlMinutes = DEFAULT_TTL_MIN): string {
  const token = signOrderLinkToken(partnerId, ttlMinutes);
  return `${STOREFRONT_ORIGIN}/${username}?olt=${token}`;
}
