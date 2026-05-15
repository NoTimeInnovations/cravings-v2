"use server";

/**
 * Server-side wrappers around the delivery-agents-server hub. Used by the
 * order store when a partner has the `delivery_agent` feature flag turned on
 * to dispatch / cancel deliveries through Adloggs (the first plugin).
 *
 * Every call here is **fire-and-forget from the caller's perspective** —
 * failures are logged and surfaced as `{ ok: false, message }` but must
 * never block the local Hasura mutation that triggered them.
 *
 * Growjet code path is unaffected: this file is only invoked when
 * `partner.feature_flags.delivery_agent.enabled === true`.
 */

type Result =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status?: number; message: string };

function getConfig(): { url: string; key: string } | null {
  const url = process.env.DELIVERY_AGENTS_SERVER_URL;
  const key = process.env.DELIVERY_AGENTS_SERVER_API_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

async function postJson(path: string, body: unknown): Promise<Result> {
  const cfg = getConfig();
  if (!cfg) {
    return { ok: false, message: "DELIVERY_AGENTS_SERVER_URL or _API_KEY not configured" };
  }
  let res: Response;
  try {
    res = await fetch(`${cfg.url}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cfg.key,
      },
      body: JSON.stringify(body),
      // Don't let a slow Adloggs response wedge the UI's status mutation.
      signal: AbortSignal.timeout(10_000),
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
    const msg = (parsed as { error?: { message?: string } })?.error?.message;
    return { ok: false, status: res.status, message: msg || `HTTP ${res.status}` };
  }
  return { ok: true, data: (parsed as Record<string, unknown>) ?? {} };
}

export async function dispatchDeliveryAgent(orderId: string, provider = "adloggs"): Promise<Result> {
  if (!orderId) return { ok: false, message: "orderId required" };
  return postJson("/v1/delivery/book", { orderId, provider });
}

export async function cancelDeliveryAgent(orderId: string, reason: string): Promise<Result> {
  if (!orderId) return { ok: false, message: "orderId required" };
  return postJson("/v1/delivery/cancel", { orderId, reason: reason.slice(0, 500) });
}

/**
 * Probe whether the configured 3PL agent can serve a delivery between two
 * points + return an estimated price. Called from the checkout modals when
 * the partner has both `feature_flags.delivery_agent.enabled` and
 * `delivery_rules.use_delivery_agent_charge` set. The hub caches results
 * for 60 s per rounded-coord pair, so we can safely call on every address
 * change without hammering Adloggs.
 */
export async function checkDeliveryAgentAvailability(input: {
  pickup: { lat: number; lng: number; pincode?: string };
  drop: { lat: number; lng: number; pincode?: string };
  paymentMethod?: "cod" | "online";
  utcOffsetMinutes?: number;
  partnerMerchantId?: string;
  provider?: string;
}): Promise<Result> {
  const body = {
    provider: input.provider ?? "adloggs",
    pickup: input.pickup,
    drop: input.drop,
    paymentMethod: input.paymentMethod ?? "online",
    utcOffsetMinutes: input.utcOffsetMinutes ?? 330,
    ...(input.partnerMerchantId ? { partnerMerchantId: input.partnerMerchantId } : {}),
  };
  return postJson("/v1/delivery/availability", body);
}

/**
 * Probe every registered 3PL provider in parallel. Used by admin-v2
 * OrderDetails to show "X of N delivery partners can serve this address"
 * on live orders.
 *
 * Response shape: `{ totalProviders, availableCount, providers: [{provider,
 * displayName, available, etaToPickupMin?, distanceKm?, estimatedPrice?,
 * reason?}] }`.
 */
export async function checkAllProvidersAvailability(input: {
  pickup: { lat: number; lng: number; pincode?: string };
  drop: { lat: number; lng: number; pincode?: string };
  paymentMethod?: "cod" | "online";
  utcOffsetMinutes?: number;
  partnerMerchantId?: string;
}): Promise<Result> {
  return postJson("/v1/delivery/availability/all", {
    pickup: input.pickup,
    drop: input.drop,
    paymentMethod: input.paymentMethod ?? "online",
    utcOffsetMinutes: input.utcOffsetMinutes ?? 330,
    ...(input.partnerMerchantId ? { partnerMerchantId: input.partnerMerchantId } : {}),
  });
}

export async function getDeliveryAgentLocation(
  orderId: string,
  provider = "adloggs",
): Promise<Result> {
  const cfg = getConfig();
  if (!cfg) return { ok: false, message: "delivery-agents-server not configured" };
  let res: Response;
  try {
    res = await fetch(`${cfg.url}/v1/delivery/${orderId}/agent?provider=${provider}`, {
      method: "GET",
      headers: { "x-api-key": cfg.key },
      signal: AbortSignal.timeout(5_000),
    });
  } catch (err) {
    return { ok: false, message: `network: ${(err as Error).message}` };
  }
  if (res.status === 404) return { ok: false, status: 404, message: "no agent yet" };
  if (!res.ok) return { ok: false, status: res.status, message: `HTTP ${res.status}` };
  return { ok: true, data: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}
