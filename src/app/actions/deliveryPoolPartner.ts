"use server";

/**
 * Server-side proxy to the Delivery Pool partner API (order-service,
 * /integration/partner/:rid/*). Keeps the internal key off the browser; the
 * Cravings partner panel passes its own restaurant id (= partner id).
 * Env: DELIVERY_POOL_URL, DELIVERY_POOL_INTERNAL_KEY (blank in dev = open).
 */

const BASE = "/delivery/v1/integration/partner";

type Result = { ok: boolean; data?: any; error?: string };

async function call(path: string, init: RequestInit): Promise<Result> {
  const url = process.env.DELIVERY_POOL_URL;
  if (!url) return { ok: false, error: "DELIVERY_POOL_URL not set" };
  const key = process.env.DELIVERY_POOL_INTERNAL_KEY;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key) headers["x-internal-key"] = key;
  try {
    const res = await fetch(`${url}${BASE}/${path}`, { ...init, headers, cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: data?.error?.message || `HTTP ${res.status}` };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function poolGetConfig(rid: string): Promise<Result> {
  return call(`${rid}/config`, { method: "GET" });
}
export async function poolSyncConfig(
  rid: string,
  body: { name?: string; pool_enabled?: boolean; assignment_mode?: string; pickup?: { lat: number; lng: number }; contact_phone?: string },
): Promise<Result> {
  return call(`${rid}/config`, { method: "PUT", body: JSON.stringify(body) });
}
export async function poolLinkRequests(rid: string): Promise<Result> {
  return call(`${rid}/link-requests`, { method: "GET" });
}
export async function poolApprove(rid: string, linkId: string): Promise<Result> {
  return call(`${rid}/link-requests/${linkId}/approve`, { method: "POST" });
}
export async function poolReject(rid: string, linkId: string, reason: string): Promise<Result> {
  return call(`${rid}/link-requests/${linkId}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
}
export async function poolRiders(rid: string): Promise<Result> {
  return call(`${rid}/riders`, { method: "GET" });
}
export async function poolInvite(rid: string, phone: string): Promise<Result> {
  return call(`${rid}/riders/invite`, { method: "POST", body: JSON.stringify({ phone }) });
}
export async function poolDisableRider(rid: string, riderId: string, disabled: boolean): Promise<Result> {
  return call(`${rid}/riders/${riderId}/disable`, { method: "POST", body: JSON.stringify({ disabled }) });
}
export async function poolRemoveRider(rid: string, riderId: string): Promise<Result> {
  return call(`${rid}/riders/${riderId}/remove`, { method: "POST" });
}
export async function poolOrders(rid: string): Promise<Result> {
  return call(`${rid}/orders`, { method: "GET" });
}
/** View-only documents (presigned) of a rider linked to this restaurant. */
export async function poolRiderDocs(rid: string, riderId: string): Promise<Result> {
  return call(`${rid}/riders/${riderId}/docs`, { method: "GET" });
}
