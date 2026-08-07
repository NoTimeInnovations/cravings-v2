"use server";

// Manage a partner's Shiprocket credentials and settings.
//
// EVERY export of a "use server" file is a public, unauthenticated RPC endpoint —
// anyone who can POST to this app can call these with any partner id. These
// actions decide which merchant's wallet gets spent, so every one of them is
// authorized first, exactly like src/app/actions/razorpayPartner.ts. The
// credential decryption itself deliberately lives in the plain module
// src/lib/shiprocket/creds.ts so it can never be dispatched as an action.
//
// Nothing here ever returns the stored password, in any form, to the client.

import { randomBytes } from "crypto";
import { getAuthCookie } from "@/app/auth/actions";
import { fetchFromHasuraServer } from "@/lib/hasuraServerClient";
import { encryptSecret, paymentCryptoConfigured } from "@/lib/paymentCrypto";
import {
  configFromRow,
  credsFromRow,
  fetchShiprocketCredRow,
  isShiprocketEnabled,
} from "@/lib/shiprocket/creds";
import {
  getWalletBalance,
  listPickupLocations,
  shiprocketLogin,
} from "@/lib/shiprocket/client";
import {
  parseShiprocketConfig,
  type ShiprocketConfig,
  type ShiprocketPickupLocation,
} from "@/lib/shiprocket/types";

/**
 * A superadmin may manage any partner; a partner may manage only their own id.
 * Returns the SERVER-derived actor for the audit trail — a client-supplied actor
 * is never trusted.
 */
async function requireOwnerOrSuperadmin(partnerId: string): Promise<{ id: string }> {
  const auth = await getAuthCookie();
  if (!auth?.id) throw new Error("Not authorized");
  if (auth.role === "superadmin") return { id: auth.id };
  if (auth.role === "partner" && auth.id === partnerId) return { id: auth.id };
  throw new Error("Not authorized");
}

export interface ShiprocketStatus {
  /** api_email present AND the password decrypts. */
  configured: boolean;
  /** Non-secret — echoed back so the field can be prefilled. */
  apiEmail: string | null;
  /** A connection test has succeeded since the last credential change. */
  verified: boolean;
  lastVerifiedAt: string | null;
  lastError: string | null;
  /** feature_flags contains shiprocket-true. */
  featureEnabled: boolean;
  /** RZP_CREDS_MASTER_KEY is set on this server; without it nothing can be saved. */
  masterKeyConfigured: boolean;
  config: ShiprocketConfig;
}

export async function getShiprocketStatus(partnerId: string): Promise<ShiprocketStatus> {
  await requireOwnerOrSuperadmin(partnerId);
  const base: ShiprocketStatus = {
    configured: false,
    apiEmail: null,
    verified: false,
    lastVerifiedAt: null,
    lastError: null,
    featureEnabled: false,
    masterKeyConfigured: paymentCryptoConfigured(),
    config: parseShiprocketConfig(null),
  };
  if (!partnerId) return base;
  try {
    const [row, featureEnabled] = await Promise.all([
      fetchShiprocketCredRow(partnerId),
      isShiprocketEnabled(partnerId),
    ]);
    return {
      configured: !!credsFromRow(row, partnerId),
      apiEmail: row?.api_email ?? null,
      verified: !!row?.last_verified_at,
      lastVerifiedAt: row?.last_verified_at ?? null,
      lastError: row?.last_error ?? null,
      featureEnabled,
      masterKeyConfigured: paymentCryptoConfigured(),
      config: configFromRow(row),
    };
  } catch (e) {
    console.error("[shiprocket] status lookup failed", (e as Error)?.message);
    return base;
  }
}

/**
 * This store's webhook token, minting one the first time it is asked for.
 *
 * Per store rather than one shared secret, because Shiprocket's callback carries
 * NOTHING that identifies the sending account — with a single global token, any
 * merchant holding it could post events for another merchant's order and drive it
 * to completed. The token is the last path segment of the URL they paste, so it
 * both authenticates the caller and names the partner.
 *
 * `rotate` mints a fresh one; the old URL stops working the moment it is saved, so
 * the merchant has to update Shiprocket. That is the point of a rotation.
 */
export async function ensureShiprocketWebhookToken(
  partnerId: string,
  opts: { rotate?: boolean } = {},
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  try {
    await requireOwnerOrSuperadmin(partnerId);
  } catch {
    return { ok: false, error: "Not authorized" };
  }
  try {
    const row = await fetchShiprocketCredRow(partnerId);
    const current = configFromRow(row).webhook_token;
    if (current && !opts.rotate) return { ok: true, token: current };

    // 32 hex chars of CSPRNG. This is a bearer token in a URL, so it has to be
    // unguessable on its own — there is no second factor behind it.
    const token = randomBytes(16).toString("hex");
    const merged = parseShiprocketConfig({
      ...(configFromRow(row) as unknown as Record<string, unknown>),
      webhook_token: token,
    });
    // upsert: a store may open this panel before it has ever saved credentials.
    await fetchFromHasuraServer(
      `mutation SetWebhookToken($obj: partner_shiprocket_credentials_insert_input!) {
        insert_partner_shiprocket_credentials_one(
          object: $obj,
          on_conflict: {
            constraint: partner_shiprocket_credentials_pkey,
            update_columns: [config, updated_at]
          }
        ) { partner_id }
      }`,
      { obj: { partner_id: partnerId, config: merged, updated_at: new Date().toISOString() } },
    );
    return { ok: true, token };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || "Could not create a webhook token" };
  }
}

/**
 * Save the API user, and optionally the config.
 *
 * A BLANK password means "keep the stored one" — the field is always rendered
 * empty, so treating blank as "clear it" would wipe working credentials every
 * time someone edited the pickup location.
 *
 * Changing the email or the password clears the cached token AND last_verified_at:
 * a credential nobody has tested since it changed must not read as verified, or
 * the feature toggle would let a store start dispatching against it.
 */
export async function saveShiprocketCredentials(
  partnerId: string,
  input: { apiEmail: string; password?: string; config?: Partial<ShiprocketConfig> },
): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireOwnerOrSuperadmin(partnerId);
  if (!partnerId) return { ok: false, error: "partnerId required" };
  if (!paymentCryptoConfigured()) {
    return {
      ok: false,
      error: "Secure credential storage is not configured on this server (RZP_CREDS_MASTER_KEY).",
    };
  }

  const apiEmail = (input.apiEmail || "").trim();
  if (!apiEmail) return { ok: false, error: "Shiprocket API user email is required" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(apiEmail)) {
    return { ok: false, error: "That does not look like a valid email address" };
  }

  try {
    const existing = await fetchShiprocketCredRow(partnerId);
    const password = (input.password || "").trim();
    const emailChanged = (existing?.api_email ?? "") !== apiEmail;
    const credsChanged = emailChanged || !!password;

    const now = new Date().toISOString();
    const obj: Record<string, any> = {
      partner_id: partnerId,
      api_email: apiEmail,
      updated_by: actor.id,
      updated_at: now,
    };
    if (password) obj.password_enc = encryptSecret(password, partnerId);
    if (input.config) {
      // Merge onto the stored config so a partial save (e.g. just the pickup
      // location) cannot silently reset the package size or the trigger.
      obj.config = parseShiprocketConfig({
        ...(configFromRow(existing) as unknown as Record<string, unknown>),
        ...input.config,
        package: { ...configFromRow(existing).package, ...(input.config.package ?? {}) },
      });
    }
    if (credsChanged) {
      obj.token_enc = null;
      obj.token_expires_at = null;
      obj.last_verified_at = null;
      obj.last_error = null;
    }

    const updateColumns = Object.keys(obj).filter((k) => k !== "partner_id");
    await fetchFromHasuraServer(
      `mutation UpsertShiprocketCreds(
        $obj: partner_shiprocket_credentials_insert_input!,
        $cols: [partner_shiprocket_credentials_update_column!]!
      ) {
        insert_partner_shiprocket_credentials_one(
          object: $obj,
          on_conflict: { constraint: partner_shiprocket_credentials_pkey, update_columns: $cols }
        ) { partner_id }
      }`,
      { obj, cols: updateColumns },
    );
    return { ok: true };
  } catch (e: any) {
    console.error("[shiprocket] save creds failed", e?.message || e);
    return { ok: false, error: "Failed to save credentials" };
  }
}

export interface ShiprocketTestResult {
  ok: boolean;
  message?: string;
  pickupLocations?: ShiprocketPickupLocation[];
  walletBalance?: number | null;
}

/**
 * Log in to Shiprocket with the stored credentials and read back the merchant's
 * pickup locations.
 *
 * Ungated on purpose (`gated: false`): testing is what a partner does BEFORE the
 * feature is switched on, so requiring the flag would make the test impossible to
 * pass. The credentials themselves are still owner-scoped by the guard above.
 *
 * The pickup list is the real payload here — it turns the pickup field into a
 * dropdown. A free-text nickname that Shiprocket does not recognise fails every
 * order-create with an error that never mentions the pickup location.
 */
export async function testShiprocketConnection(
  partnerId: string,
): Promise<ShiprocketTestResult> {
  await requireOwnerOrSuperadmin(partnerId);
  if (!partnerId) return { ok: false, message: "partnerId required" };
  if (!paymentCryptoConfigured()) {
    return { ok: false, message: "Secure credential storage is not configured on this server." };
  }

  const row = await fetchShiprocketCredRow(partnerId);
  const creds = credsFromRow(row, partnerId);
  if (!creds) {
    return { ok: false, message: "Save your Shiprocket API user email and password first." };
  }

  // Always a fresh login on an explicit test — the point is to prove the stored
  // password works right now, not that a token cached days ago is still alive.
  const login = await shiprocketLogin(creds.email, creds.password);
  if (!login.ok) {
    await persistTestResult(partnerId, false, login.message);
    return { ok: false, message: login.message };
  }
  await persistTestResult(partnerId, true, null, login.data.token, login.data.expiresAt);

  // Both ungated — the test runs BEFORE the feature is switched on, so a gated
  // call here would always come back "not enabled" and the wallet would read as
  // unknown on exactly the screen that needs it.
  const [locations, wallet] = await Promise.all([
    listPickupLocations(partnerId, { gated: false }),
    getWalletBalance(partnerId, { gated: false }).catch(() => ({
      ok: false as const,
      code: "unknown" as const,
      message: "",
    })),
  ]);

  if (!locations.ok) {
    // The credentials ARE valid — we just authenticated. Say so, rather than
    // reporting a connection failure the partner would try to fix by re-typing a
    // password that was never wrong.
    //
    // pickupLocations is left UNDEFINED, not []: "could not read" and "you have
    // none" must stay distinguishable, or a rate-limited retry would replace a
    // good dropdown with an empty one mid-edit.
    return {
      ok: true,
      message: `Connected, but the pickup locations could not be read: ${locations.message}`,
      walletBalance: wallet.ok ? wallet.data.balance : null,
    };
  }

  return {
    ok: true,
    pickupLocations: locations.data,
    walletBalance: wallet.ok ? wallet.data.balance : null,
  };
}

async function persistTestResult(
  partnerId: string,
  success: boolean,
  error: string | null,
  token?: string,
  expiresAt?: Date,
): Promise<void> {
  const now = new Date().toISOString();
  const set: Record<string, any> = {
    last_error: error,
    last_verified_at: success ? now : null,
    updated_at: now,
  };
  if (success && token && expiresAt) {
    set.token_enc = encryptSecret(token, partnerId);
    set.token_expires_at = expiresAt.toISOString();
  } else if (!success) {
    set.token_enc = null;
    set.token_expires_at = null;
  }
  try {
    await fetchFromHasuraServer(
      `mutation ShiprocketTestResult($id: uuid!, $set: partner_shiprocket_credentials_set_input!) {
        update_partner_shiprocket_credentials_by_pk(pk_columns: { partner_id: $id }, _set: $set) { partner_id }
      }`,
      { id: partnerId, set },
    );
  } catch (e) {
    console.warn("[shiprocket] could not persist test result", (e as Error)?.message);
  }
}

/**
 * Gate for the Features toggle: may this partner switch Shiprocket ON?
 *
 * Enabling a store whose credentials have never passed a test means every order
 * silently fails at dispatch time, which is exactly the porter_bridge trap where a
 * partner sees "enabled" and no rider ever comes.
 */
export async function canEnableShiprocket(
  partnerId: string,
): Promise<{ ok: boolean; reason?: string }> {
  await requireOwnerOrSuperadmin(partnerId);
  const row = await fetchShiprocketCredRow(partnerId);
  if (!credsFromRow(row, partnerId)) {
    return {
      ok: false,
      reason: "Add your Shiprocket API user under Settings → Integrations → Shiprocket first.",
    };
  }
  if (!row?.last_verified_at) {
    return {
      ok: false,
      reason: "Run Test connection under Settings → Integrations → Shiprocket first.",
    };
  }
  if (!configFromRow(row).pickup_location) {
    return {
      ok: false,
      reason: "Choose a Shiprocket pickup location under Settings → Integrations → Shiprocket first.",
    };
  }
  return { ok: true };
}
