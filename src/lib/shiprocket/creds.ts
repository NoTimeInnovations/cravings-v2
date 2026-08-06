// SERVER-ONLY. Reads and writes a partner's Shiprocket credentials, cached login
// token and config.
//
// This is a PLAIN module, deliberately NOT "use server". Every export of a
// "use server" file becomes a public RPC endpoint that anyone can POST to, and
// `shiprocketCredsForPartner` returns a merchant's plaintext password — exporting
// it from an action file would publish a credential oracle. Same reasoning as
// src/lib/ownRazorpayServer.ts; the callable, authorized surface lives in
// src/app/actions/shiprocketPartner.ts.
//
// All I/O goes through fetchFromHasuraServer (server-only admin secret), never
// fetchFromHasura — that one ships its admin secret to the browser.

import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { encryptSecret, tryDecryptSecret } from "@/lib/paymentCrypto";
import { parseShiprocketConfig, type ShiprocketConfig } from "./types";

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/shiprocket/creds.ts must never be imported into client code — it decrypts merchant credentials.",
  );
}

export interface ShiprocketCredRow {
  partner_id?: string;
  api_email?: string | null;
  password_enc?: string | null;
  token_enc?: string | null;
  token_expires_at?: string | null;
  config?: unknown;
  last_verified_at?: string | null;
  last_error?: string | null;
}

const CRED_FIELDS = `
  partner_id
  api_email
  password_enc
  token_enc
  token_expires_at
  config
  last_verified_at
  last_error
`;

/** Raw row, no feature gate — the status action needs it even when the flag is off. */
export async function fetchShiprocketCredRow(
  partnerId: string,
): Promise<ShiprocketCredRow | null> {
  if (!partnerId) return null;
  try {
    const data = await fetchFromHasuraServer(
      `query ShiprocketCreds($id: uuid!) {
        partner_shiprocket_credentials_by_pk(partner_id: $id) { ${CRED_FIELDS} }
      }`,
      { id: partnerId },
    );
    return (data as any)?.partner_shiprocket_credentials_by_pk ?? null;
  } catch (e) {
    console.error("[shiprocket] cred lookup failed", (e as Error)?.message);
    return null;
  }
}

/**
 * Decrypt a row into usable credentials, or null.
 *
 * The AAD is the partner id: a ciphertext written under a different partner will
 * not decrypt here, so a row transplanted into someone else's record fails closed
 * rather than silently authenticating as the wrong merchant.
 */
export function credsFromRow(
  row: ShiprocketCredRow | null | undefined,
  partnerId: string,
): { email: string; password: string } | null {
  if (!row?.api_email) return null;
  const password = tryDecryptSecret(row.password_enc, partnerId);
  if (!password) return null;
  return { email: row.api_email, password };
}

export function configFromRow(row: ShiprocketCredRow | null | undefined): ShiprocketConfig {
  return parseShiprocketConfig(row?.config);
}

/** True when the partner's feature_flags CSV has shiprocket switched ON. */
export async function isShiprocketEnabled(partnerId: string): Promise<boolean> {
  try {
    const data = await fetchFromHasuraServer(
      `query ShiprocketFlag($id: uuid!) { partners_by_pk(id: $id) { feature_flags } }`,
      { id: partnerId },
    );
    const flags: string | null = (data as any)?.partners_by_pk?.feature_flags ?? null;
    // Substring match is what every other dispatch path uses, and it is safe here
    // because no other flag name ends in "shiprocket".
    return !!flags?.includes("shiprocket-true");
  } catch (e) {
    console.error("[shiprocket] flag lookup failed", (e as Error)?.message);
    return false;
  }
}

/**
 * The gated resolver used by dispatch: credentials + config, but ONLY when the
 * partner actually has the feature switched on.
 *
 * Gating here rather than at each call site is deliberate — dispatch is reachable
 * from a status transition, a manual button and (later) a cron, and a check that
 * lives at the call site is the one a fourth caller forgets.
 */
export async function shiprocketCredsForPartner(partnerId: string): Promise<
  | { email: string; password: string; config: ShiprocketConfig; row: ShiprocketCredRow }
  | null
> {
  if (!partnerId) return null;
  if (!(await isShiprocketEnabled(partnerId))) return null;
  const row = await fetchShiprocketCredRow(partnerId);
  const creds = credsFromRow(row, partnerId);
  if (!creds || !row) return null;
  return { ...creds, config: configFromRow(row), row };
}

// ── Token cache ────────────────────────────────────────────────────────────
// Shiprocket's login token lives 10 days and there is no refresh endpoint, so we
// cache it and re-login only when it is close to expiry. Two layers: a per-process
// Map (a warm serverless instance handling several orders should not re-read the
// DB each time) and the encrypted DB column behind it.

const memo = new Map<string, { token: string; expMs: number }>();

/** Refresh this far ahead of the real expiry, so a call never starts on a token
 *  that dies mid-flight. */
const REFRESH_SKEW_MS = 12 * 60 * 60 * 1000; // 12 hours

/** A still-valid token from the in-process cache, without touching the DB. */
export function readMemoToken(partnerId: string): string | null {
  const hit = memo.get(partnerId);
  if (!hit) return null;
  if (hit.expMs - REFRESH_SKEW_MS > Date.now()) return hit.token;
  memo.delete(partnerId);
  return null;
}

/**
 * A usable cached token from a row the caller already loaded, or null. Populates
 * the in-process cache as a side effect, so the next call in the same dispatch
 * can skip the DB entirely.
 *
 * Takes the row rather than fetching it: the caller needs the row anyway (to
 * reach the password when the cache misses), so a self-fetching variant would
 * just double the query count on the cold path.
 */
export function tokenFromRow(
  row: ShiprocketCredRow | null | undefined,
  partnerId: string,
): string | null {
  if (!row?.token_enc || !row.token_expires_at) return null;
  const expMs = Date.parse(row.token_expires_at);
  if (!Number.isFinite(expMs) || expMs - REFRESH_SKEW_MS <= Date.now()) return null;
  const token = tryDecryptSecret(row.token_enc, partnerId);
  if (!token) return null;
  memo.set(partnerId, { token, expMs });
  return token;
}

export async function writeCachedToken(
  partnerId: string,
  token: string,
  expiresAt: Date,
): Promise<void> {
  memo.set(partnerId, { token, expMs: expiresAt.getTime() });
  try {
    await fetchFromHasuraServer(
      `mutation CacheShiprocketToken($id: uuid!, $tok: String!, $exp: timestamptz!, $now: timestamptz!) {
        update_partner_shiprocket_credentials_by_pk(
          pk_columns: { partner_id: $id },
          _set: { token_enc: $tok, token_expires_at: $exp, last_verified_at: $now, last_error: null, updated_at: $now }
        ) { partner_id }
      }`,
      {
        id: partnerId,
        tok: encryptSecret(token, partnerId),
        exp: expiresAt.toISOString(),
        now: new Date().toISOString(),
      },
    );
  } catch (e) {
    // A token we could not persist is a slower next request, not a failure —
    // the caller already has a working token in hand.
    console.warn("[shiprocket] token cache write failed", (e as Error)?.message);
  }
}

/** Drop a token we now know is dead, so the next call re-authenticates. */
export async function clearCachedToken(partnerId: string): Promise<void> {
  memo.delete(partnerId);
  try {
    await fetchFromHasuraServer(
      `mutation ClearShiprocketToken($id: uuid!) {
        update_partner_shiprocket_credentials_by_pk(
          pk_columns: { partner_id: $id },
          _set: { token_enc: null, token_expires_at: null }
        ) { partner_id }
      }`,
      { id: partnerId },
    );
  } catch {
    /* best effort — the in-process drop above is what matters this request */
  }
}

/** Record (or clear) the last failure so the settings screen can explain itself. */
export async function recordShiprocketError(
  partnerId: string,
  message: string | null,
): Promise<void> {
  try {
    await fetchFromHasuraServer(
      `mutation ShiprocketError($id: uuid!, $err: String, $now: timestamptz!) {
        update_partner_shiprocket_credentials_by_pk(
          pk_columns: { partner_id: $id },
          _set: { last_error: $err, updated_at: $now }
        ) { partner_id }
      }`,
      { id: partnerId, err: message, now: new Date().toISOString() },
    );
  } catch {
    /* best effort */
  }
}
