"use server";

/**
 * In-dashboard "connect a delivery provider account" flow.
 *
 * Lets a partner OTP-log-in their Porter / Rapido consumer account straight
 * from admin-v2 → Settings → Ordering → Delivery (instead of visiting the
 * porter-bridge dashboard). Wraps the bridge's auth endpoints and, on a
 * successful verify, AUTO-TAGS the account into a dispatch group whose number
 * is the FIRST 5 DIGITS of the login mobile — then mirrors that group + the
 * mobile onto the partner row so dispatch resolves it.
 *
 *   send OTP → verify OTP → (bridge) set group = first5(mobile)
 *            → (partner)  set {provider}_mobile + delivery_rules.delivery_provider_groups[provider]
 *
 * Logout invalidates the account's token on the bridge but keeps the row, so
 * the partner can reconnect later with a fresh OTP.
 *
 * All bridge calls go through PORTER_BRIDGE_URL + PORTER_BRIDGE_API_KEY, the
 * same config src/app/actions/porterBridge.ts uses.
 */

import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { getAuthCookie } from "@/app/auth/actions";
import type {
  ConnectProvider,
  ProviderConnection,
  VerifyOtpSuccess,
} from "@/lib/deliveryBridgeTypes";

type BridgeResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status?: number; message: string };

/**
 * Guard: the caller must be the logged-in partner whose row they're touching.
 * These actions are directly callable from the client, so every one validates
 * the session cookie's partner id === the partnerId it was handed. Without this
 * a partner could connect/log-out/read another partner's delivery accounts.
 */
async function assertPartner(
  partnerId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!partnerId) return { ok: false, message: "partnerId required" };
  const auth = await getAuthCookie();
  if (!auth || auth.role !== "partner" || auth.id !== partnerId) {
    return { ok: false, message: "Not authorized" };
  }
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────
// Bridge transport (mirrors porterBridge.ts)
// ──────────────────────────────────────────────────────────────────────────

function getConfig(): { url: string; key: string } | null {
  const url = process.env.PORTER_BRIDGE_URL;
  const key = process.env.PORTER_BRIDGE_API_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

async function bridgeFetch(
  path: string,
  init: RequestInit & { json?: unknown; timeoutMs?: number } = {},
): Promise<BridgeResult> {
  const cfg = getConfig();
  if (!cfg) {
    return {
      ok: false,
      message: "PORTER_BRIDGE_URL or PORTER_BRIDGE_API_KEY not configured",
    };
  }
  const headers: Record<string, string> = {
    "X-API-Key": cfg.key,
    ...(init.json !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };
  const { timeoutMs, ...fetchInit } = init;
  let res: Response;
  try {
    res = await fetch(`${cfg.url}${path}`, {
      ...fetchInit,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      signal: AbortSignal.timeout(timeoutMs ?? 25_000),
    });
  } catch (err) {
    return { ok: false, message: `network: ${(err as Error).message}` };
  }
  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    /* keep null */
  }
  if (!res.ok) {
    const msg =
      (parsed as { error?: string })?.error ?? `HTTP ${res.status} on ${path}`;
    return { ok: false, status: res.status, message: msg };
  }
  return { ok: true, data: (parsed as Record<string, unknown>) ?? {} };
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

/** Strip country code / spaces / symbols, take the trailing 10 digits. Returns
 *  null unless it's a valid 10-digit Indian number (starts 6-9). */
function normaliseMobile(p: string | null | undefined): string | null {
  if (!p) return null;
  const digits = String(p).replace(/\D+/g, "");
  if (digits.length < 10) return null;
  const ten = digits.slice(-10);
  return /^[6-9][0-9]{9}$/.test(ten) ? ten : null;
}

const PROVIDER_MOBILE_COLUMN: Record<ConnectProvider, string> = {
  porter: "porter_mobile",
  rapido: "rapido_mobile",
};

async function loadPartnerConn(partnerId: string): Promise<{
  delivery_rules: Record<string, unknown>;
  porter_mobile: string | null;
  rapido_mobile: string | null;
} | null> {
  const data = await fetchFromHasuraServer(
    `query DeliveryConn($id: uuid!) {
      partners_by_pk(id: $id) { delivery_rules porter_mobile rapido_mobile }
    }`,
    { id: partnerId },
  );
  const p = data?.partners_by_pk;
  if (!p) return null;
  // delivery_rules is jsonb — usually an object, but tolerate a stringified one.
  let rules: Record<string, unknown> = {};
  if (p.delivery_rules && typeof p.delivery_rules === "object") {
    rules = p.delivery_rules as Record<string, unknown>;
  } else if (typeof p.delivery_rules === "string") {
    try {
      rules = JSON.parse(p.delivery_rules);
    } catch {
      rules = {};
    }
  }
  return {
    delivery_rules: rules,
    porter_mobile: p.porter_mobile ?? null,
    rapido_mobile: p.rapido_mobile ?? null,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// 1. Send OTP
// ──────────────────────────────────────────────────────────────────────────

interface SendOtpInput {
  partnerId: string;
  provider: ConnectProvider;
  mobile: string;
  /** Partner store name — used as the account label + Porter/Rapido first name. */
  storeName?: string;
  /** Partner city (Rapido benefits from it; falls back to a default upstream). */
  city?: string;
  /** Partner pickup coords — Porter resolves the login region from these so a
   *  non-Kochi partner still receives the OTP. */
  coords?: { lat: number; lng: number };
}

export async function sendDeliveryOtp(
  input: SendOtpInput,
): Promise<{ ok: true; exists?: boolean } | { ok: false; message: string }> {
  const auth = await assertPartner(input.partnerId);
  if (!auth.ok) return auth;
  const mobile = normaliseMobile(input.mobile);
  if (!mobile) {
    return { ok: false, message: "Enter a valid 10-digit mobile number" };
  }
  const label = (input.storeName || "").slice(0, 60) || undefined;

  if (input.provider === "porter") {
    const res = await bridgeFetch(`/api/v1/auth/send-otp`, {
      method: "POST",
      json: {
        mobile,
        label,
        ...(input.coords
          ? { coords: { lat: input.coords.lat, lng: input.coords.lng } }
          : {}),
      },
    });
    if (!res.ok) return { ok: false, message: res.message };
    return { ok: true, exists: Boolean(res.data.exists) };
  }

  // rapido
  const res = await bridgeFetch(`/api/v1/rapido/auth/send-otp`, {
    method: "POST",
    json: {
      mobile,
      label,
      city: input.city || undefined,
      firstName: label,
    },
  });
  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true, exists: Boolean(res.data.userAccountValid) };
}

// ──────────────────────────────────────────────────────────────────────────
// 2. Verify OTP → activate account + save the mobile (group is set MANUALLY)
// ──────────────────────────────────────────────────────────────────────────

interface VerifyOtpInput {
  partnerId: string;
  provider: ConnectProvider;
  mobile: string;
  otp: string;
  storeName?: string;
}

export async function verifyDeliveryOtp(
  input: VerifyOtpInput,
): Promise<VerifyOtpSuccess | { ok: false; message: string }> {
  const auth = await assertPartner(input.partnerId);
  if (!auth.ok) return auth;
  const mobile = normaliseMobile(input.mobile);
  if (!mobile) return { ok: false, message: "Enter a valid 10-digit mobile" };
  const otp = String(input.otp || "").replace(/\D/g, "");
  if (otp.length < 4) return { ok: false, message: "Enter the OTP you received" };

  const firstName = (input.storeName || "").slice(0, 40) || undefined;

  // 2a. Verify with the bridge → account becomes active.
  const verifyPath =
    input.provider === "porter"
      ? `/api/v1/auth/verify-otp`
      : `/api/v1/rapido/auth/verify-otp`;
  const verify = await bridgeFetch(verifyPath, {
    method: "POST",
    json: { mobile, otp, firstName },
  });
  if (!verify.ok) return { ok: false, message: verify.message };
  const accountId = String((verify.data as { accountId?: string }).accountId ?? "");
  if (!accountId) {
    return { ok: false, message: "Verified, but the bridge returned no account id" };
  }

  // 2b. Save ONLY the mobile — the dispatch group is set manually in the
  //     settings form (and pushed to the bridge on Save via setProviderGroup).
  const mobileColumn = PROVIDER_MOBILE_COLUMN[input.provider];
  await fetchFromHasuraServer(
    `mutation SaveDeliveryConn($id: uuid!, $updates: partners_set_input!) {
      update_partners_by_pk(pk_columns: { id: $id }, _set: $updates) { id }
    }`,
    {
      id: input.partnerId,
      updates: { [mobileColumn]: mobile, updated_at: new Date().toISOString() },
    },
  );

  return {
    ok: true,
    provider: input.provider,
    mobile,
    group: "",
    accountId,
    mobileColumn,
    deliveryRules: {},
  };
}

// ──────────────────────────────────────────────────────────────────────────
// 2b. Push the manually-set dispatch groups to the bridge accounts.
//     Called on Save: for each connected provider, tag its bridge account with
//     the group the partner typed (empty clears it) so the dispatch's `groups`
//     resolves to a real pooled account. Returns per-provider outcomes; never
//     throws so it can't block the settings save.
// ──────────────────────────────────────────────────────────────────────────

export async function setProviderGroups(input: {
  partnerId: string;
}): Promise<{ ok: true; results: Record<string, string> } | { ok: false; message: string }> {
  const auth = await assertPartner(input.partnerId);
  if (!auth.ok) return auth;
  const conn = await loadPartnerConn(input.partnerId);
  if (!conn) return { ok: false, message: "partner not found" };
  const rawGroups =
    (conn.delivery_rules.delivery_provider_groups as Record<string, unknown>) || {};

  const results: Record<string, string> = {};
  for (const provider of ["porter", "rapido"] as ConnectProvider[]) {
    const mobile = normaliseMobile(
      provider === "porter" ? conn.porter_mobile : conn.rapido_mobile,
    );
    if (!mobile) {
      results[provider] = "no connected account";
      continue;
    }
    const group = String(rawGroups[provider] ?? "").trim();
    const acct = await resolveAccountId(provider, mobile);
    if (!acct) {
      results[provider] = "account not found on bridge";
      continue;
    }
    const res = await bridgeFetch(`/api/v1/accounts/${acct.accountId}/group`, {
      method: "POST",
      json: { groupNumber: group },
    });
    results[provider] = res.ok ? (group ? `set ${group}` : "cleared") : `failed: ${res.message}`;
  }
  return { ok: true, results };
}

// ──────────────────────────────────────────────────────────────────────────
// 3. Logout (invalidate token; keep the row so they can reconnect)
// ──────────────────────────────────────────────────────────────────────────

/** Resolve the bridge account id for a (provider, mobile) pair via the accounts
 *  list — the by-mobile route is Porter-centric, so the list is the reliable
 *  cross-provider lookup. */
async function resolveAccountId(
  provider: ConnectProvider,
  mobile: string,
): Promise<{ accountId: string; status: string; groupNumber?: string } | null> {
  const res = await bridgeFetch(`/api/v1/accounts`, { method: "GET" });
  if (!res.ok) return null;
  const rows = Array.isArray(res.data)
    ? (res.data as unknown[])
    : ((res.data as { data?: unknown[] }).data ?? []);
  for (const r of rows as Array<Record<string, unknown>>) {
    const svc = (r.service as string) ?? "porter";
    // Normalise the bridge's mobile too — don't assume it's already 10-digit.
    if (svc === provider && normaliseMobile(String(r.mobile)) === mobile) {
      return {
        accountId: String(r._id),
        status: String(r.status ?? ""),
        groupNumber: r.groupNumber ? String(r.groupNumber) : undefined,
      };
    }
  }
  return null;
}

export async function logoutDeliveryProvider(input: {
  partnerId: string;
  provider: ConnectProvider;
  mobile: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await assertPartner(input.partnerId);
  if (!auth.ok) return auth;
  const mobile = normaliseMobile(input.mobile);
  if (!mobile) return { ok: false, message: "No connected mobile to log out" };
  // The mobile must actually be THIS partner's connected number for the provider
  // — stops a partner logging out an account they don't own by passing any number.
  const conn = await loadPartnerConn(input.partnerId);
  const ownMobile = normaliseMobile(
    input.provider === "porter" ? conn?.porter_mobile : conn?.rapido_mobile,
  );
  if (!ownMobile || ownMobile !== mobile) {
    return { ok: false, message: "That number isn't connected to your store" };
  }
  const acct = await resolveAccountId(input.provider, mobile);
  if (!acct) {
    return { ok: false, message: "No connected account found on the bridge" };
  }
  const res = await bridgeFetch(`/api/v1/accounts/${acct.accountId}/logout`, {
    method: "POST",
    json: {},
  });
  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────
// 4. Connection status for the settings UI
// ──────────────────────────────────────────────────────────────────────────

export async function getDeliveryConnections(input: {
  partnerId: string;
}): Promise<{
  ok: true;
  porter: ProviderConnection;
  rapido: ProviderConnection;
} | { ok: false; message: string }> {
  const auth = await assertPartner(input.partnerId);
  if (!auth.ok) return auth;
  const conn = await loadPartnerConn(input.partnerId);
  if (!conn) return { ok: false, message: "partner not found" };
  const rawGroups =
    (conn.delivery_rules.delivery_provider_groups as Record<string, unknown>) ||
    {};
  // Coerce to strings defensively — the jsonb column has no schema, so guard
  // against a non-string sneaking in and rendering as "[object Object]".
  const groups: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawGroups)) {
    if (v != null && v !== "") groups[k] = String(v);
  }

  const porterMobile = normaliseMobile(conn.porter_mobile);
  const rapidoMobile = normaliseMobile(conn.rapido_mobile);

  const notConnected = (provider: ConnectProvider): ProviderConnection => ({
    mobile: null,
    group: groups[provider] ?? null,
    status: "none",
    connected: false,
    groupAccounts: 0,
  });

  // Skip the bridge only when there's genuinely nothing to check — no saved
  // mobile AND no group configured for either provider. (Avoids the old
  // perpetual "Checking…" for brand-new partners.)
  if (!porterMobile && !rapidoMobile && !groups.porter && !groups.rapido) {
    return { ok: true, porter: notConnected("porter"), rapido: notConnected("rapido") };
  }

  // Ask the bridge (short timeout so the settings screen never wedges). On
  // failure we fall back to "configured-but-unverified" rather than wrongly
  // prompting a reconnect.
  const list = await bridgeFetch(`/api/v1/accounts`, { method: "GET", timeoutMs: 8_000 });
  const rows: Array<Record<string, unknown>> = list.ok
    ? (Array.isArray(list.data)
        ? (list.data as Array<Record<string, unknown>>)
        : ((list.data as { data?: Array<Record<string, unknown>> }).data ?? []))
    : [];

  const build = (provider: ConnectProvider, rawMobile: string | null): ProviderConnection => {
    const mobile = normaliseMobile(rawMobile);
    const group = groups[provider] ?? null;

    if (!list.ok) {
      // Couldn't reach the bridge — treat anything configured as connected so we
      // don't nag; we just can't show the live account count.
      const configured = !!(mobile || group);
      return {
        mobile,
        group,
        status: configured ? "unknown" : "none",
        connected: configured,
        groupAccounts: 0,
      };
    }

    // Active accounts pooled under this provider's group — what dispatch books
    // from. This is the key signal in the manual-group model: a group with ≥1
    // active account is "connected" even if THIS partner never OTP-logged a
    // number themselves.
    const groupAccounts = group
      ? rows.filter(
          (r) =>
            ((r.service as string) ?? "porter") === provider &&
            String(r.status ?? "") === "active" &&
            String(r.groupNumber ?? "") === group,
        ).length
      : 0;

    // The partner's own saved account (when a mobile is on file).
    const match = mobile
      ? rows.find(
          (r) =>
            ((r.service as string) ?? "porter") === provider &&
            normaliseMobile(String(r.mobile)) === mobile,
        )
      : undefined;
    const mobileStatus = match ? String(match.status ?? "none") : "none";

    const connected = mobileStatus === "active" || groupAccounts > 0;
    const status =
      mobileStatus !== "none" ? mobileStatus : groupAccounts > 0 ? "active" : "none";
    return { mobile, group, status, connected, groupAccounts };
  };

  return {
    ok: true,
    porter: build("porter", conn.porter_mobile),
    rapido: build("rapido", conn.rapido_mobile),
  };
}
