"use server";

import { getAuthCookie } from "@/app/auth/actions";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { generateApiKey } from "@/lib/publicApi/keys";

/**
 * Self-service API keys for a partner's own integrations.
 *
 * Until now keys were minted by scripts/issue-partner-api-key.mjs, which meant
 * every partner wanting to drive order status from their POS had to ask us. The
 * key model is unchanged — ck_live_<32>, sha256 in the DB, plaintext shown once
 * — this only moves issuance into the dashboard.
 *
 * SECURITY: the partner id ALWAYS comes from the session cookie and is never
 * accepted as an argument. A partner_id parameter here would let anyone with a
 * dashboard login mint a working key for another restaurant, which is the whole
 * ball game — the gate binds every request to whatever partner the key names.
 */

export type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_per_min: number;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

/** Scopes a partner may grant themselves from the dashboard. */
const SELF_SERVE_SCOPES = new Set(["orders", "whatsapp"]);

async function currentPartnerId(): Promise<string | null> {
  const auth = await getAuthCookie();
  if (!auth || auth.role !== "partner" || !auth.id) return null;
  return auth.id;
}

export async function listApiKeys(): Promise<
  { ok: true; keys: ApiKeyRow[] } | { ok: false; message: string }
> {
  const partnerId = await currentPartnerId();
  if (!partnerId) return { ok: false, message: "Not authorized" };
  try {
    // key_hash is deliberately never selected — nothing outside the gate needs it.
    const data: any = await fetchFromHasuraServer(
      `query PartnerApiKeys($p: uuid!) {
         partner_api_keys(where: { partner_id: { _eq: $p } }, order_by: { created_at: desc }) {
           id name key_prefix scopes rate_per_min last_used_at revoked_at created_at
         }
       }`,
      { p: partnerId },
    );
    return { ok: true, keys: (data?.partner_api_keys || []) as ApiKeyRow[] };
  } catch (e) {
    console.error("listApiKeys failed", e);
    return { ok: false, message: "Could not load your API keys." };
  }
}

/**
 * Mint a key. The plaintext is returned ONCE and never stored — if the partner
 * loses it they must issue another, which is the point of storing only a hash.
 */
export async function createApiKey(input: {
  name: string;
  scopes?: string[];
}): Promise<{ ok: true; key: string; row: ApiKeyRow } | { ok: false; message: string }> {
  const partnerId = await currentPartnerId();
  if (!partnerId) return { ok: false, message: "Not authorized" };

  const name = (input?.name || "").trim().slice(0, 60);
  if (!name) return { ok: false, message: "Give the key a name." };

  const requested = (input?.scopes || []).filter((s) => SELF_SERVE_SCOPES.has(s));
  const scopes = requested.length ? Array.from(new Set(requested)) : ["orders"];

  // A cap on live keys: without one a scripted loop could mint thousands of
  // rows, and every one of them is a credential someone has to keep track of.
  try {
    const count: any = await fetchFromHasuraServer(
      `query KeyCount($p: uuid!) {
         partner_api_keys_aggregate(where: { partner_id: { _eq: $p }, revoked_at: { _is_null: true } }) {
           aggregate { count }
         }
       }`,
      { p: partnerId },
    );
    if ((count?.partner_api_keys_aggregate?.aggregate?.count ?? 0) >= 10) {
      return { ok: false, message: "You already have 10 active keys. Revoke one first." };
    }
  } catch {
    /* the cap is a guard rail, not a gate — a failed count must not block issuance */
  }

  const { key, prefix, hash } = generateApiKey();
  try {
    const data: any = await fetchFromHasuraServer(
      `mutation IssueKey($o: partner_api_keys_insert_input!) {
         insert_partner_api_keys_one(object: $o) {
           id name key_prefix scopes rate_per_min last_used_at revoked_at created_at
         }
       }`,
      { o: { partner_id: partnerId, name, key_prefix: prefix, key_hash: hash, scopes } },
    );
    const row = data?.insert_partner_api_keys_one;
    if (!row) return { ok: false, message: "Could not create the key." };
    return { ok: true, key, row: row as ApiKeyRow };
  } catch (e) {
    console.error("createApiKey failed", e);
    return { ok: false, message: "Could not create the key." };
  }
}

/**
 * Revoke, never delete: partner_api_logs reference the key, and keeping the row
 * is what lets someone answer "what did this key do before we killed it".
 */
export async function revokeApiKey(
  keyId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const partnerId = await currentPartnerId();
  if (!partnerId) return { ok: false, message: "Not authorized" };
  if (!keyId) return { ok: false, message: "Missing key id" };
  try {
    // Scoped to partner_id as well as the key id, so a guessed uuid from another
    // account matches nothing rather than revoking someone else's integration.
    const data: any = await fetchFromHasuraServer(
      `mutation RevokeKey($id: uuid!, $p: uuid!) {
         update_partner_api_keys(
           where: { id: { _eq: $id }, partner_id: { _eq: $p }, revoked_at: { _is_null: true } },
           _set: { revoked_at: "now()" }
         ) { affected_rows }
       }`,
      { id: keyId, p: partnerId },
    );
    if (!data?.update_partner_api_keys?.affected_rows) {
      return { ok: false, message: "That key no longer exists." };
    }
    return { ok: true };
  } catch (e) {
    console.error("revokeApiKey failed", e);
    return { ok: false, message: "Could not revoke the key." };
  }
}
