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
