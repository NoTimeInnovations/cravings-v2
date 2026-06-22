"use server";

/**
 * Server-side proxy to the Delivery Pool admin API (order-service). Keeps the
 * internal key off the browser — the /superadmin DeliveryPoolDashboard calls
 * these server actions. Env:
 *   DELIVERY_POOL_URL=http://localhost:4004
 *   DELIVERY_POOL_INTERNAL_KEY=<= order-service INTERNAL_API_KEY>  (blank in dev = open)
 */

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
  return poolGet(`riders/${riderId}/docs`) as Promise<{ data: Record<string, unknown>[] } | null>;
}
