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

// Version byte that marks an ENCRYPTED (phone-bearing) token. Legacy tokens are
// base64url of an ASCII "<digits>.<...>" string whose first byte is a digit
// (0x30–0x39), so 0x01 can never collide with them — that's how verify tells
// the two shapes apart.
const ENC_TOKEN_VERSION = 0x01;

function secret(): string {
  return process.env.META_APP_SECRET || process.env.WHATSAPP_ACCESS_TOKEN || "menuthere-order-link";
}

// 32-byte AES key derived from the same secret the HMAC uses. SHA-256 yields
// exactly 32 bytes (aes-256 key size).
function encKey(): Buffer {
  return crypto.createHash("sha256").update(secret()).digest();
}

// Encrypt the customer's (local) phone + expiry into an opaque token. Unlike the
// signed userId token, the phone is NOT recoverable from the link without our
// key. partnerId is bound as GCM additional-authenticated-data, so a token
// minted for one partner fails to decrypt against another (same guarantee the
// HMAC payload's partnerId gave). Layout (then base64url):
//   [version(1)] [iv(12)] [tag(16)] [ciphertext]
// Plaintext is JSON { p: localPhone, e: expiryMs }.
export function encryptPhoneToken(
  partnerId: string,
  localPhone: string,
  ttlMinutes = AUTH_TTL_MIN,
): string {
  const exp = Date.now() + ttlMinutes * 60 * 1000;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey(), iv);
  cipher.setAAD(Buffer.from(partnerId, "utf8"));
  const pt = Buffer.from(JSON.stringify({ p: localPhone, e: exp }), "utf8");
  const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([ENC_TOKEN_VERSION]), iv, tag, ct]).toString(
    "base64url",
  );
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
): { valid: boolean; expired: boolean; userId: string | null; phone: string | null } {
  const fail = {
    valid: false,
    expired: false,
    userId: null as string | null,
    phone: null as string | null,
  };
  let buf: Buffer;
  try {
    buf = Buffer.from(token, "base64url");
  } catch {
    return fail;
  }

  // Encrypted (phone-bearing) token — version-byte tagged. Decryption itself is
  // the integrity check: a tampered token, wrong key, or wrong partner (AAD)
  // throws and we treat it as invalid.
  if (buf.length > 29 && buf[0] === ENC_TOKEN_VERSION) {
    try {
      const iv = buf.subarray(1, 13);
      const tag = buf.subarray(13, 29);
      const ct = buf.subarray(29);
      const decipher = crypto.createDecipheriv("aes-256-gcm", encKey(), iv);
      decipher.setAAD(Buffer.from(partnerId, "utf8"));
      decipher.setAuthTag(tag);
      const pt = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
      const obj = JSON.parse(pt) as { p?: string; e?: number };
      const exp = Number(obj.e);
      const phone = obj.p ? String(obj.p) : null;
      if (!exp || !phone) return fail;
      if (Date.now() > exp) return { valid: false, expired: true, userId: null, phone };
      return { valid: true, expired: false, userId: null, phone };
    } catch {
      return fail;
    }
  }

  // Legacy signed token: `exp.sig` (plain) or `exp.userId.sig` (auto-login).
  try {
    const parts = buf.toString("utf8").split(".");
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
    if (Date.now() > exp) return { valid: false, expired: true, userId, phone: null };
    return { valid: true, expired: false, userId, phone: null };
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
  opts?: {
    // Local phone for an ENCRYPTED auto-login token. Preferred over userId: the
    // account is resolved/created when the link is tapped (off the WhatsApp
    // reply path), and the phone is not recoverable from the link.
    phone?: string | null;
    userId?: string | null;
    ttlMinutes?: number;
    customDomain?: string | null;
    // A base64url-encoded snapshot of the customer's last order. When present we
    // append &back=true (skip onboarding) + &ro=<payload> so the storefront
    // pre-fills the cart + address and opens checkout straight away — no client
    // query needed. Rides the same single-use ?olt= auto-login claim.
    reorderPayload?: string | null;
  },
): string {
  const phone = opts?.phone ?? null;
  const userId = opts?.userId ?? null;
  const isAuth = !!(phone || userId);
  const ttl = opts?.ttlMinutes ?? (isAuth ? AUTH_TTL_MIN : DEFAULT_TTL_MIN);
  const token = phone
    ? encryptPhoneToken(partnerId, phone, ttl)
    : signOrderLinkToken(partnerId, ttl, userId);
  const reorderQ = opts?.reorderPayload
    ? `&back=true&ro=${opts.reorderPayload}`
    : "";
  const customDomain = opts?.customDomain?.trim();
  if (customDomain) {
    return `https://${customDomain}/?olt=${token}${reorderQ}`;
  }
  return `${STOREFRONT_ORIGIN}/${username}?olt=${token}${reorderQ}`;
}
