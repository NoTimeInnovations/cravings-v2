import { SignJWT, jwtVerify } from "jose";

/**
 * Scoped auth for the Menuthere delivery app.
 *
 * The delivery app used to ship the Hasura ADMIN secret and talk to Hasura
 * directly. That secret is god-mode over the whole DB, so it must never live
 * in a client. Instead cravings-v2 (which already holds the admin secret
 * server-side) mints a short-lived JWT scoped to a single delivery boy.
 *
 * The JWT is a Hasura-format token: when Hasura runs in JWT mode with the same
 * HS256 key, it reads the `https://hasura.io/jwt/claims` block to resolve the
 * caller's role + `x-hasura-delivery-boy-id`, and row-level permissions on the
 * `delivery_boy` role restrict every read/write to that rider's own data.
 *
 * Hasura side (set on the Hasura instance, additive — admin secret still works):
 *   HASURA_GRAPHQL_JWT_SECRET = {"type":"HS256","key":"<DELIVERY_JWT_SECRET>"}
 */

const HASURA_CLAIMS_NS = "https://hasura.io/jwt/claims";
const ROLE = "delivery_boy";
// 30 days. Matches the app's existing "stay logged in until logout" behaviour
// (it previously persisted the profile forever). Short enough that a leaked
// token eventually dies; long enough not to interrupt a rider mid-shift.
const TTL_SECONDS = 60 * 60 * 24 * 30;

function key(): Uint8Array {
  const secret = process.env.DELIVERY_JWT_SECRET;
  if (!secret) {
    throw new Error("DELIVERY_JWT_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

/** Mint a Hasura-scoped JWT for one delivery boy. */
export async function signDeliveryToken(deliveryBoyId: string): Promise<string> {
  return new SignJWT({
    [HASURA_CLAIMS_NS]: {
      "x-hasura-allowed-roles": [ROLE],
      "x-hasura-default-role": ROLE,
      "x-hasura-delivery-boy-id": deliveryBoyId,
    },
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(deliveryBoyId)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(key());
}

/**
 * Verify a token and return the delivery boy id it's scoped to, or null if the
 * token is missing/expired/forged. Never throws.
 */
export async function verifyDeliveryToken(
  token: string,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ["HS256"],
    });
    const claims = payload[HASURA_CLAIMS_NS] as
      | Record<string, unknown>
      | undefined;
    const id = claims?.["x-hasura-delivery-boy-id"];
    return typeof id === "string" && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

/** Pull the raw bearer token out of an Authorization header. */
export function bearerFromRequest(req: Request): string | null {
  const h =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

/**
 * Gate for rider-only endpoints: returns the authenticated delivery boy id, or
 * null when the caller presents no valid token. Callers should 401 on null.
 */
export async function requireDeliveryBoy(req: Request): Promise<string | null> {
  const token = bearerFromRequest(req);
  if (!token) return null;
  return verifyDeliveryToken(token);
}
