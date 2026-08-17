/**
 * Outbound order webhooks — lets a partner's own POS receive an order the moment
 * it is placed, instead of polling or being wired up through a bespoke bridge.
 *
 * v1 sends exactly one event, `order.created`. Adding more later is a matter of
 * widening WebhookEvent and calling send from another place; the signature,
 * envelope and SSRF guard below are the parts that should not need revisiting.
 *
 * Stored on `partners.webhook_settings` (jsonb):
 *   { enabled: boolean, url: string, secret: string }
 *
 * The secret is stored in plaintext BECAUSE HMAC needs it — it cannot be hashed
 * like a password. It is the partner's own secret and is shown back to them in
 * settings, which is normal for webhook signing (Stripe, GitHub and Meta all do
 * the same), but it means anyone who can read the partner row can forge a
 * signature. Treat it as a credential, not a public identifier.
 */

import crypto from "crypto";

export type WebhookEvent =
  | "order.created"
  | "order.status_updated"
  | "payment.status_updated"
  | "delivery.status_updated";

/** Every event we can send, for the settings docs and for validating a
 *  partner's event filter later. Kept next to the union so the two cannot drift. */
export const WEBHOOK_EVENTS: WebhookEvent[] = [
  "order.created",
  "order.status_updated",
  "payment.status_updated",
  "delivery.status_updated",
];

export type WebhookSettings = {
  enabled?: boolean;
  url?: string | null;
  secret?: string | null;
};

/** Parse the jsonb blob, which may arrive as a string or an object depending on
 *  which write path last touched the row. */
export function parseWebhookSettings(raw: unknown): WebhookSettings {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" ? (raw as WebhookSettings) : {};
}

/**
 * Is this URL safe to POST to?
 *
 * The endpoint is supplied by the partner, so an unguarded fetch is a
 * server-side request forgery hole: our server would happily POST order JSON to
 * `http://localhost:8080`, to a private 10.x address, or to the cloud metadata
 * endpoint at 169.254.169.254, which on most hosts hands out credentials.
 *
 * Requiring https also means the secret and the order payload are not sent in
 * clear text across the internet.
 */
export function isSafeWebhookUrl(raw: string | null | undefined): { ok: boolean; reason?: string } {
  const value = (raw || "").trim();
  if (!value) return { ok: false, reason: "No URL set" };
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return { ok: false, reason: "Not a valid URL" };
  }
  if (u.protocol !== "https:") return { ok: false, reason: "Must start with https://" };
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    host === "::1"
  ) {
    return { ok: false, reason: "Cannot point at localhost" };
  }
  // Literal private / link-local / loopback ranges. A hostname that RESOLVES to
  // one of these still gets through — DNS is not checked here because it cannot
  // be done reliably before the request, and re-resolution between check and
  // fetch would defeat it anyway. This blocks the accidental and casual cases.
  if (
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return { ok: false, reason: "Cannot point at a private network address" };
  }
  return { ok: true };
}

/** The signed envelope every event shares. */
export type WebhookEnvelope<T> = {
  event: WebhookEvent;
  /** Present and true ONLY for a "send test event" from settings.
   *
   *  At the envelope level, not inside `data`, so a handler can bail out before
   *  it parses or trusts anything. A test that was indistinguishable from a real
   *  order would print a ticket in someone's kitchen, which is precisely the
   *  outcome a test button must not have. */
  test?: boolean;
  /** Unique per delivery — use it to make your handler idempotent, because a
   *  retry (or a duplicate from our side) repeats the same id. */
  id: string;
  /** ISO-8601, UTC. */
  created_at: string;
  data: T;
};

/**
 * Sign the EXACT bytes that are sent.
 *
 * The receiver must verify against the raw request body, not a re-serialised
 * object: key order and whitespace differ between JSON implementations, so
 * re-encoding produces a different string and the signature will never match.
 */
export function signWebhookBody(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

/** Header names, exported so docs and the verifier cannot drift from the sender. */
export const SIGNATURE_HEADER = "x-menuthere-signature";
export const TIMESTAMP_HEADER = "x-menuthere-timestamp";
export const EVENT_HEADER = "x-menuthere-event";

export type OrderWebhookPayload = {
  order_id: string;
  order_number: number | string | null;
  status: string | null;
  type: string | null;
  placed_at: string;
  currency: string | null;
  totals: {
    subtotal: number | null;
    delivery_charge: number | null;
    packing_charge: number | null;
    gst: number | null;
    discount: number | null;
    grand_total: number | null;
  };
  customer: {
    name: string | null;
    phone: string | null;
    address: string | null;
  };
  table: { number: number | null; name: string | null } | null;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    variant: string | null;
notes: string | null;
  }>;
  notes: string | null;
  payment: { method: string | null; is_paid: boolean };
};

/** Sent when an order moves through the kitchen/delivery state machine. */
export type OrderStatusPayload = {
  order_id: string;
  order_number: number | string | null;
  /** The status BEFORE this change — null when we could not read it, which is
   *  better than guessing, since a POS may key its own transitions on it. */
  previous_status: string | null;
  status: string;
  type: string | null;
  changed_at: string;
};

/** Sent when payment state changes: marked paid, or the method recorded/changed. */
export type PaymentStatusPayload = {
  order_id: string;
  order_number: number | string | null;
  is_paid: boolean;
  payment_method: string | null;
  grand_total: number | null;
  currency: string | null;
  changed_at: string;
};

/** Sent when a delivery partner is assigned or their state changes. */
export type DeliveryStatusPayload = {
  order_id: string;
  order_number: number | string | null;
  status: string;
  provider: string | null;
  driver: { name: string | null; phone: string | null; vehicle_number: string | null } | null;
  tracking_url: string | null;
  changed_at: string;
};

/**
 * Deliver one event. Returns a result rather than throwing: a partner's endpoint
 * being down must never fail the customer's order, so every caller treats this
 * as fire-and-forget and the outcome is only for logging.
 *
 * A short timeout for the same reason — a slow endpoint should not hold a
 * serverless function open.
 */
export async function deliverWebhook(
  settings: WebhookSettings,
  event: WebhookEvent,
  data: unknown,
  deliveryId: string,
  opts?: { test?: boolean },
): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!settings.enabled) return { ok: false, error: "disabled" };
  const guard = isSafeWebhookUrl(settings.url);
  if (!guard.ok) return { ok: false, error: guard.reason };
  const secret = (settings.secret || "").trim();
  if (!secret) return { ok: false, error: "No secret set" };

  const envelope: WebhookEnvelope<unknown> = {
    event,
    id: deliveryId,
    created_at: new Date().toISOString(),
    ...(opts?.test ? { test: true } : {}),
    data,
  };
  // Serialise ONCE and sign those bytes — see signWebhookBody.
  const body = JSON.stringify(envelope);
  const timestamp = String(Math.floor(Date.now() / 1000));

  try {
    const res = await fetch(settings.url!.trim(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [SIGNATURE_HEADER]: signWebhookBody(body, secret),
        [TIMESTAMP_HEADER]: timestamp,
        [EVENT_HEADER]: event,
        "user-agent": "Menuthere-Webhook/1",
      },
      body,
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "request failed" };
  }
}
