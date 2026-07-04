import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { hashApiKey } from "./keys";

// ─── Shared gate for the public partner API (/api/v1/*) ──────────────────────
// Every request: authenticate the Bearer API key → resolve its partner_id (the
// caller NEVER passes partner_id; it is locked to the key) → enforce scope +
// rate limit → audit-log. All Hasura access is via the SERVER-ONLY client, never
// the browser-exposed admin secret.

export type ApiAuth = {
  partnerId: string;
  keyId: string;
  scopes: string[];
  ratePerMin: number;
};

export function apiError(status: number, error: string, detail?: string): NextResponse {
  return NextResponse.json(
    { ok: false, error, ...(detail ? { detail } : {}) },
    { status },
  );
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "";
}

// Validate the Authorization: Bearer <key> header. Returns { auth } on success,
// or { res } with a ready error response.
export async function authenticate(
  req: NextRequest,
): Promise<{ auth: ApiAuth } | { res: NextResponse }> {
  const header = req.headers.get("authorization") || "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return {
      res: apiError(401, "missing_api_key", "Provide 'Authorization: Bearer <key>'."),
    };
  }
  const key = m[1].trim();

  let row: any;
  try {
    const data = await fetchFromHasuraServer(
      `query ApiKey($h: String!) {
        partner_api_keys(where: { key_hash: { _eq: $h } }, limit: 1) {
          id partner_id scopes rate_per_min revoked_at
        }
      }`,
      { h: hashApiKey(key) },
    );
    row = data?.partner_api_keys?.[0];
  } catch {
    return { res: apiError(503, "auth_unavailable", "Could not validate the API key. Try again.") };
  }

  if (!row || row.revoked_at) {
    return { res: apiError(401, "invalid_api_key", "The API key is invalid or has been revoked.") };
  }

  // Best-effort last-used stamp (never blocks the request).
  fetchFromHasuraServer(
    `mutation TouchKey($id: uuid!, $t: timestamptz!) {
      update_partner_api_keys_by_pk(pk_columns: { id: $id }, _set: { last_used_at: $t }) { id }
    }`,
    { id: row.id, t: new Date().toISOString() },
  ).catch(() => {});

  return {
    auth: {
      partnerId: row.partner_id,
      keyId: row.id,
      scopes: Array.isArray(row.scopes) ? row.scopes : [],
      ratePerMin: row.rate_per_min || 120,
    },
  };
}

export function requireScope(auth: ApiAuth, scope: string): NextResponse | null {
  if (auth.scopes.includes(scope)) return null;
  return apiError(403, "scope_denied", `This API key lacks the '${scope}' scope.`);
}

// Atomic fixed-window rate limit. Each request bumps a per-key, per-minute
// counter with an atomic `_inc` (Postgres row lock) BEFORE doing work, so a
// burst of concurrent requests serializes on the row and cannot all read a
// stale count. Fails OPEN on a counter error so a Hasura hiccup can't hard-block
// a legitimate integration.
export async function checkRateLimit(auth: ApiAuth): Promise<NextResponse | null> {
  try {
    const windowStart = new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString();
    // Ensure the window row exists (no-op if already there).
    await fetchFromHasuraServer(
      `mutation EnsureRateWindow($o: partner_api_rate_counters_insert_input!) {
        insert_partner_api_rate_counters_one(
          object: $o
          on_conflict: { constraint: partner_api_rate_counters_pkey, update_columns: [] }
        ) { key_id }
      }`,
      { o: { key_id: auth.keyId, window_start: windowStart, count: 0 } },
    );
    // Atomic increment → the returned value is this request's position in the window.
    const data = await fetchFromHasuraServer(
      `mutation BumpRateWindow($k: uuid!, $w: timestamptz!) {
        update_partner_api_rate_counters(
          where: { key_id: { _eq: $k }, window_start: { _eq: $w } }
          _inc: { count: 1 }
        ) { returning { count } }
      }`,
      { k: auth.keyId, w: windowStart },
    );
    const count = data?.update_partner_api_rate_counters?.returning?.[0]?.count ?? 1;
    if (count > auth.ratePerMin) {
      return apiError(429, "rate_limited", `Rate limit of ${auth.ratePerMin} requests/minute exceeded.`);
    }
  } catch {
    /* fail open on counter errors */
  }
  return null;
}

// Fire-and-forget audit row for every handled request.
export function logRequest(p: {
  keyId?: string;
  partnerId?: string;
  method: string;
  path: string;
  status: number;
  ip?: string;
  ref?: string;
}): void {
  fetchFromHasuraServer(
    `mutation ApiLog($o: partner_api_logs_insert_input!) {
      insert_partner_api_logs_one(object: $o) { id }
    }`,
    {
      o: {
        key_id: p.keyId ?? null,
        partner_id: p.partnerId ?? null,
        method: p.method,
        path: p.path,
        status: p.status,
        ip: p.ip || null,
        ref: p.ref || null,
      },
    },
  ).catch(() => {});
}

// ─── Idempotency (per key + idempotency key) ─────────────────────────────────
// Atomic pre-claim: a request RESERVES the idempotency key (inserts a pending
// row) BEFORE doing work. The PK(key_id, idem_key) is the mutual-exclusion
// point, so exactly one concurrent request can win and dispatch the send; losers
// get the stored result (if done) or 409 in-progress. This closes the
// check-then-act double-send window.
export type IdemClaim =
  | { won: true }
  | { won: false; response: any | null; status: number | null; ageMs: number };

export async function claimIdempotency(keyId: string, idemKey: string): Promise<IdemClaim> {
  try {
    const data = await fetchFromHasuraServer(
      `mutation ClaimIdem($o: partner_api_idempotency_insert_input!) {
        insert_partner_api_idempotency(
          objects: [$o]
          on_conflict: { constraint: partner_api_idempotency_pkey, update_columns: [] }
        ) { affected_rows }
      }`,
      { o: { key_id: keyId, idem_key: idemKey, status: 0 } },
    );
    if ((data?.insert_partner_api_idempotency?.affected_rows ?? 0) === 1) {
      return { won: true }; // we reserved it
    }
  } catch {
    // Claim errored → treat as won so a transient DB error can't block the first
    // legitimate call (idempotency is best-effort under DB failure).
    return { won: true };
  }
  // Lost the claim — read the existing row.
  try {
    const data = await fetchFromHasuraServer(
      `query ReadIdem($k: uuid!, $i: String!) {
        partner_api_idempotency(where: { key_id: { _eq: $k }, idem_key: { _eq: $i } }, limit: 1) {
          status response created_at
        }
      }`,
      { k: keyId, i: idemKey },
    );
    const row = data?.partner_api_idempotency?.[0];
    return {
      won: false,
      response: row?.response ?? null,
      status: row?.status ?? null,
      ageMs: row?.created_at ? Date.now() - new Date(row.created_at).getTime() : 0,
    };
  } catch {
    return { won: false, response: null, status: null, ageMs: 0 };
  }
}

// Finalize a reserved key with the successful response (returned on replay).
export async function completeIdempotency(
  keyId: string,
  idemKey: string,
  status: number,
  response: any,
): Promise<void> {
  await fetchFromHasuraServer(
    `mutation CompleteIdem($k: uuid!, $i: String!, $s: Int!, $r: jsonb!) {
      update_partner_api_idempotency(
        where: { key_id: { _eq: $k }, idem_key: { _eq: $i } }
        _set: { status: $s, response: $r }
      ) { affected_rows }
    }`,
    { k: keyId, i: idemKey, s: status, r: response },
  ).catch(() => {});
}

// Release a reserved key so a FAILED send can be retried with the same key.
export async function releaseIdempotency(keyId: string, idemKey: string): Promise<void> {
  await fetchFromHasuraServer(
    `mutation ReleaseIdem($k: uuid!, $i: String!) {
      delete_partner_api_idempotency(where: { key_id: { _eq: $k }, idem_key: { _eq: $i } }) { affected_rows }
    }`,
    { k: keyId, i: idemKey },
  ).catch(() => {});
}
