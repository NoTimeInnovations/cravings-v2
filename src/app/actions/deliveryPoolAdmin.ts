"use server";

/**
 * Server-side proxy to the Delivery Pool admin API (order-service). Keeps the
 * internal key off the browser — the /superadmin DeliveryPoolDashboard calls
 * these server actions. Env:
 *   DELIVERY_POOL_URL=http://localhost:4004
 *   DELIVERY_POOL_INTERNAL_KEY=<= order-service INTERNAL_API_KEY>  (blank in dev = open)
 */

import { fetchFromHasura } from "@/lib/hasuraClient";
import { poolSyncConfig } from "./deliveryPoolPartner";

type Json = Record<string, unknown> | null;

async function poolGet(path: string): Promise<Json> {
  const url = process.env.DELIVERY_POOL_URL;
  if (!url) return null;
  const key = process.env.DELIVERY_POOL_INTERNAL_KEY;
  const headers: Record<string, string> = {};
  if (key) headers["x-internal-key"] = key;
  try {
    const res = await fetch(`${url}/delivery/v1/admin/${path}`, { headers, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Json;
  } catch {
    return null;
  }
}

export async function getPoolOverview(): Promise<Json> {
  return poolGet("overview");
}

export async function getPoolOrders(): Promise<{ data: Record<string, unknown>[] } | null> {
  return poolGet("orders?status=active") as Promise<{ data: Record<string, unknown>[] } | null>;
}

export async function getPoolRiders(): Promise<{ data: Record<string, unknown>[] } | null> {
  return poolGet("riders") as Promise<{ data: Record<string, unknown>[] } | null>;
}

export async function getPoolOfferResponses(): Promise<{ data: Record<string, unknown>[] } | null> {
  return poolGet("offer-responses") as Promise<{ data: Record<string, unknown>[] } | null>;
}

// ── Interventions / moderation / geo (PRD §4.3-4.4) ──

type ActionResult = { ok: boolean; data?: any; error?: string };

async function poolPost(path: string, body?: unknown): Promise<ActionResult> {
  const url = process.env.DELIVERY_POOL_URL;
  if (!url) return { ok: false, error: "DELIVERY_POOL_URL not set" };
  const key = process.env.DELIVERY_POOL_INTERNAL_KEY;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key) headers["x-internal-key"] = key;
  try {
    const res = await fetch(`${url}/delivery/v1/admin/${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function forcePoolAssign(orderId: string, riderId: string): Promise<ActionResult> {
  return poolPost(`orders/${orderId}/assign`, { rider_id: riderId });
}
export async function cancelPoolOrder(orderId: string, reason?: string): Promise<ActionResult> {
  return poolPost(`orders/${orderId}/cancel`, { reason });
}
export async function setPoolRiderStatus(riderId: string, status: string): Promise<ActionResult> {
  return poolPost(`riders/${riderId}/status`, { status });
}
export async function searchPoolRiders(lat: number, lng: number, radiusKm: number) {
  return poolGet(`riders/search?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`) as Promise<{ data: Record<string, unknown>[] } | null>;
}
export async function searchPoolRestaurants(lat: number, lng: number, radiusKm: number) {
  return poolGet(`restaurants/search?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`) as Promise<{ data: Record<string, unknown>[] } | null>;
}
export async function getPoolRiderDocs(riderId: string) {
  return poolGet(`riders/${riderId}/docs`) as Promise<{
    data: Record<string, unknown>[];
    full_name?: string;
    kyc_status?: string;
  } | null>;
}

/** Super Admin only: set the rider's KYC verdict (verified | rejected). */
export async function verifyPoolRiderKyc(
  riderId: string,
  status: "verified" | "rejected",
  reason?: string,
): Promise<ActionResult> {
  return poolPost(`riders/${riderId}/kyc`, { status, reason });
}

/**
 * Auto-register: sync every cravings partner that has the delivery_pool feature
 * into the pool's restaurant_pool_config (name + pickup geo), so they're listed
 * for riders without any manual "register" step. pool_enabled mirrors -true/-false.
 */
type PoolPartnerRow = {
  id: string;
  store_name: string | null;
  geo_location: { coordinates?: [number, number] } | null;
  feature_flags: string | null;
  phone: string | null;
  country_code: string | null;
  store_banner: string | null;
  address: string | null;
};

const POOL_PARTNER_FIELDS = `id store_name geo_location feature_flags phone country_code store_banner address`;

// Push ONE partner's config into the pool. pool_enabled mirrors the
// delivery_pool-true/-false flag, so this both registers (enable) and de-lists
// (disable) the restaurant. `enabledOverride` lets a caller pass the just-saved
// flag state directly, avoiding a read-your-write race on feature_flags.
async function syncOnePoolPartner(
  p: PoolPartnerRow,
  enabledOverride?: boolean,
): Promise<boolean> {
  const coords = p.geo_location?.coordinates;
  const pickup =
    Array.isArray(coords) && coords.length === 2 ? { lat: coords[1], lng: coords[0] } : undefined;
  const enabled =
    typeof enabledOverride === "boolean"
      ? enabledOverride
      : (p.feature_flags ?? "").includes("delivery_pool-true");
  const contact_phone = p.phone
    ? p.country_code && !p.phone.startsWith("+")
      ? p.country_code + p.phone
      : p.phone
    : undefined;
  const r = await poolSyncConfig(p.id, {
    name: p.store_name ?? undefined,
    pool_enabled: enabled,
    pickup,
    contact_phone,
    banner_url: p.store_banner ?? undefined,
    address: p.address ?? undefined,
  });
  return r.ok;
}

export async function syncAllPoolRestaurants(): Promise<{ ok: boolean; total: number; synced: number; error?: string }> {
  let partners: PoolPartnerRow[] = [];
  try {
    const data = await fetchFromHasura(
      `query PoolPartners { partners(where: { feature_flags: { _ilike: "%delivery_pool-%" } }) { ${POOL_PARTNER_FIELDS} } }`,
    );
    partners = data?.partners ?? [];
  } catch (e) {
    return { ok: false, total: 0, synced: 0, error: (e as Error).message };
  }
  let synced = 0;
  for (const p of partners) {
    if (await syncOnePoolPartner(p)) synced++;
  }
  return { ok: true, total: partners.length, synced };
}

/**
 * Register/refresh a SINGLE partner in the pool. Call this the moment the
 * delivery_pool feature is toggled (e.g. from superadmin Edit Partners) so the
 * restaurant appears in the delivery pool app immediately — without anyone
 * having to open that partner's Delivery Pool panel first (the old trigger).
 * Pass `enabled` to mirror the just-saved flag without re-reading feature_flags.
 */
export async function syncPoolRestaurant(
  partnerId: string,
  enabled?: boolean,
): Promise<{ ok: boolean; error?: string }> {
  if (!partnerId) return { ok: false, error: "no partnerId" };
  try {
    const data = await fetchFromHasura(
      `query PoolPartner($id: uuid!) { partners_by_pk(id: $id) { ${POOL_PARTNER_FIELDS} } }`,
      { id: partnerId },
    );
    const p = (data?.partners_by_pk ?? null) as PoolPartnerRow | null;
    if (!p) return { ok: false, error: "partner not found" };
    const ok = await syncOnePoolPartner(p, enabled);
    return { ok };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
