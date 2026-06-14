import crypto from "crypto";

// A short-lived, signed "order link" the welcome flow hands out. The token
// encodes an expiry + an HMAC, so the storefront can tell a fresh link from an
// expired one WITHOUT any DB state. After it expires the storefront shows a
// "send hi to get a new link" message.
//
// Two token shapes:
//   • 2-part  `exp.sig`         — HMAC over (partnerId, exp). Plain order link.
//   • 3-part  `exp.userId.sig`  — HMAC over (partnerId, exp, userId). Carries
//     the customer so the storefront can silently log them in (no OTP). Used a
//     tighter expiry since it doubles as a bearer login credential.

const DEFAULT_TTL_MIN = 30; // plain order link
const AUTH_TTL_MIN = 10; // auto-login (authed) link — tighter window
const STOREFRONT_ORIGIN = "https://menuthere.com";

function secret(): string {
  return process.env.META_APP_SECRET || process.env.WHATSAPP_ACCESS_TOKEN || "menuthere-order-link";
}

// HMAC over the exact payload string. partnerId is always part of the payload
// but never put in the URL, so a token minted for one partner can't be replayed
// against another.
function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex").slice(0, 24);
}

export function signOrderLinkToken(
  partnerId: string,
  ttlMinutes = DEFAULT_TTL_MIN,
  userId?: string | null,
): string {
  const exp = Date.now() + ttlMinutes * 60 * 1000;
  if (userId) {
    const sig = sign(`${partnerId}.${exp}.${userId}`);
    return Buffer.from(`${exp}.${userId}.${sig}`).toString("base64url");
  }
  const sig = sign(`${partnerId}.${exp}`);
  return Buffer.from(`${exp}.${sig}`).toString("base64url");
}

export function verifyOrderLinkToken(
  partnerId: string,
  token: string,
): { valid: boolean; expired: boolean; userId: string | null } {
  const fail = { valid: false, expired: false, userId: null as string | null };
  try {
    const parts = Buffer.from(token, "base64url").toString("utf8").split(".");
    let exp: number;
    let userId: string | null = null;
    let sig: string;
    let expected: string;

    if (parts.length === 3) {
      exp = Number(parts[0]);
      userId = parts[1] || null;
      sig = parts[2];
      expected = sign(`${partnerId}.${exp}.${userId}`);
    } else if (parts.length === 2) {
      exp = Number(parts[0]);
      sig = parts[1];
      expected = sign(`${partnerId}.${exp}`);
    } else {
      return fail;
    }

    if (!exp || !sig) return fail;
    if (sig.length !== expected.length) return fail;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return fail;
    if (Date.now() > exp) return { valid: false, expired: true, userId };
    return { valid: true, expired: false, userId };
  } catch {
    return fail;
  }
}

// Full ordering URL with a fresh token, e.g.
//   https://menuthere.com/oreodemo?olt=<token>
// Pass `userId` to mint an auto-login (10-min) link; omit it for a plain
// 30-min order link.
//
// When the partner has a verified custom domain we point at its ROOT
// (https://flaminhotchickenindia.com/?olt=<token>): proxy.ts maps a custom
// domain's root to /{username}, so we must NOT include the username in the
// path — doing so would rewrite to /{username}/{username} and 404. The ?olt
// query survives the rewrite. Plain menuthere links keep the /{username} path.
export function buildOrderLink(
  username: string,
  partnerId: string,
  opts?: { userId?: string | null; ttlMinutes?: number; customDomain?: string | null },
): string {
  const userId = opts?.userId ?? null;
  const ttl = opts?.ttlMinutes ?? (userId ? AUTH_TTL_MIN : DEFAULT_TTL_MIN);
  const token = signOrderLinkToken(partnerId, ttl, userId);
  const customDomain = opts?.customDomain?.trim();
  if (customDomain) {
    return `https://${customDomain}/?olt=${token}`;
  }
  return `${STOREFRONT_ORIGIN}/${username}?olt=${token}`;
}
