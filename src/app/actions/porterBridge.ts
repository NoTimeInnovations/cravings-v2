"use server";

/**
 * Server-side wrappers around porter-bridge (https://deliverybridge.menuthere.com).
 *
 * Used by the order store when a partner has the `porter_bridge` feature
 * flag turned on to dispatch a Porter 2-wheeler at order-accept time. The
 * partner must have onboarded their own Porter consumer account via the
 * porter-bridge dashboard once (OTP login from their phone). At dispatch
 * time we resolve partner.phone → porter-bridge account_id via the
 * /accounts/by-mobile lookup, then quote + book.
 *
 * Every call here is **fire-and-forget from the caller's perspective** —
 * failures get logged and persisted into the order's
 * `delivery_provider_state` + `delivery_provider_meta` columns but must
 * never block the local Hasura mutation that triggered them.
 *
 * Coexists with delivery_agent / growjet_delivery — those run independently
 * via different flags + different status transitions.
 */

import { fetchFromHasura } from "@/lib/hasuraClient";

// ──────────────────────────────────────────────────────────────────────────
// Config + transport
// ──────────────────────────────────────────────────────────────────────────

type Result =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status?: number; message: string };

function getConfig(): { url: string; key: string } | null {
  const url = process.env.PORTER_BRIDGE_URL;
  const key = process.env.PORTER_BRIDGE_API_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

async function bridgeFetch(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<Result> {
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
  let res: Response;
  try {
    res = await fetch(`${cfg.url}${path}`, {
      ...init,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      // Hard cap so a slow porter-bridge response doesn't wedge the UI.
      signal: AbortSignal.timeout(20_000),
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
      (parsed as { error?: string })?.error ??
      `HTTP ${res.status} on ${path}`;
    return { ok: false, status: res.status, message: msg };
  }
  return { ok: true, data: (parsed as Record<string, unknown>) ?? {} };
}

// ──────────────────────────────────────────────────────────────────────────
// Hasura queries
// ──────────────────────────────────────────────────────────────────────────

interface OrderForDispatch {
  id: string;
  total_price: number;
  type: string;
  status: string;
  delivery_address: string | null;
  phone: string | null;
  partner_id: string;
  notes: string | null;
  display_id: number | null;
  user: { phone: string | null; full_name: string | null } | null;
  delivery_location: { coordinates: [number, number] } | null;
  partner: {
    id: string;
    store_name: string;
    location: string | null;
    phone: string | null;
    /** Explicit override for the Porter account to dispatch from. When null,
     *  we fall back to `phone`. Add this column with:
     *    ALTER TABLE partners ADD COLUMN IF NOT EXISTS porter_mobile text;
     */
    porter_mobile: string | null;
    geo_location: { coordinates: [number, number] } | null;
    feature_flags: string | null;
  } | null;
}

const ORDER_FOR_DISPATCH_QUERY = `
  query OrderForDispatch($id: uuid!) {
    orders_by_pk(id: $id) {
      id
      total_price
      type
      status
      delivery_address
      delivery_location
      phone
      partner_id
      notes
      display_id
      user {
        phone
        full_name
      }
      partner {
        id
        store_name
        location
        phone
        porter_mobile
        geo_location
        feature_flags
      }
    }
  }
`;

/**
 * Use Hasura's `_append` on jsonb so meta MERGES with whatever's already
 * stored — without this, every refresh / cancel call overwrites the
 * accountId (and everything else) that was saved at dispatch time.
 * That bug previously broke cancel-from-cravings: the cancel action
 * read meta back, didn't find accountId, and bailed.
 *
 * Also pass `now` as a top-level variable so Hasura coerces it as a real
 * timestamp instead of trying to parse the literal string "now()".
 */
const PERSIST_PROVIDER_MUTATION = `
  mutation PersistProviderState(
    $id: uuid!,
    $state: String!,
    $orderId: String,
    $meta: jsonb!,
    $now: timestamptz!
  ) {
    update_orders_by_pk(
      pk_columns: { id: $id },
      _set: {
        delivery_provider: "porter",
        delivery_provider_state: $state,
        delivery_provider_order_id: $orderId,
        delivery_provider_last_event_at: $now
      },
      _append: {
        delivery_provider_meta: $meta
      }
    ) { id }
  }
`;

async function persistProvider(
  orderId: string,
  state: string,
  porterOrderId: string | null,
  meta: Record<string, unknown>,
): Promise<void> {
  try {
    await fetchFromHasura(PERSIST_PROVIDER_MUTATION, {
      id: orderId,
      state,
      orderId: porterOrderId,
      meta,
      now: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[porter-bridge] persistProvider failed:", err);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers — geo + coupling
// ──────────────────────────────────────────────────────────────────────────

/** Extract lat/lng from a PostGIS-style `{ coordinates: [lng, lat] }` blob.
 *  Returns null if missing or malformed. */
function extractLatLng(
  geo: { coordinates: [number, number] } | null | undefined,
): { lat: number; lng: number } | null {
  if (!geo || !Array.isArray(geo.coordinates) || geo.coordinates.length !== 2) {
    return null;
  }
  const [lng, lat] = geo.coordinates;
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }
  return { lat, lng };
}

/** Strip a partner phone of country code / spaces / non-digits, then take
 *  the trailing 10 digits. Indian numbers only. */
function normaliseMobile(p: string | null | undefined): string | null {
  if (!p) return null;
  const digits = p.replace(/\D+/g, "");
  if (digits.length < 10) return null;
  const ten = digits.slice(-10);
  return /^[6-9][0-9]{9}$/.test(ten) ? ten : null;
}

// ──────────────────────────────────────────────────────────────────────────
// Public actions
// ──────────────────────────────────────────────────────────────────────────

/**
 * Main entry point: quote + book Porter for an order that just hit
 * `accepted`. Resolves partner phone → porter-bridge account → quote +
 * book, then writes the booking metadata back to the order row.
 *
 * Returns immediately on misconfig / partner-not-onboarded; persists the
 * failure to the order so the admin UI can show "Porter dispatch failed:
 * <reason>".
 */
export async function dispatchPorterBridge(orderId: string): Promise<Result> {
  if (!orderId) return { ok: false, message: "orderId required" };

  // 1. Load order + partner from Hasura.
  let order: OrderForDispatch;
  try {
    const data = await fetchFromHasura(ORDER_FOR_DISPATCH_QUERY, {
      id: orderId,
    });
    order = data.orders_by_pk as OrderForDispatch;
  } catch (err) {
    return {
      ok: false,
      message: `hasura: ${(err as Error).message}`,
    };
  }
  if (!order) {
    return { ok: false, message: `order ${orderId} not found` };
  }
  if (!order.partner) {
    return { ok: false, message: `partner missing on order ${orderId}` };
  }

  // 2. Resolve partner → porter-bridge account by mobile.
  //    Prefer the explicit porter_mobile column when set (lets a partner use
  //    a Porter account on a different phone than their primary contact).
  //    Falls back to partner.phone for partners onboarded before that
  //    column was populated.
  const partnerMobile =
    normaliseMobile(order.partner.porter_mobile) ??
    normaliseMobile(order.partner.phone);
  if (!partnerMobile) {
    await persistProvider(orderId, "failed", null, {
      error:
        "neither partner.porter_mobile nor partner.phone is a valid 10-digit Indian number",
    });
    return { ok: false, message: "partner mobile missing/invalid" };
  }
  const lookup = await bridgeFetch(
    `/api/v1/accounts/by-mobile/${partnerMobile}`,
    { method: "GET" },
  );
  if (!lookup.ok) {
    await persistProvider(orderId, "failed", null, {
      error: `account lookup failed: ${lookup.message}`,
      partnerMobile,
    });
    return lookup;
  }
  const account = lookup.data as {
    _id: string;
    status: string;
    hasAuthToken: boolean;
  };
  if (account.status !== "active" || !account.hasAuthToken) {
    await persistProvider(orderId, "failed", null, {
      error: `porter account not active (status=${account.status}, hasToken=${account.hasAuthToken}) — partner needs to OTP-login at deliverybridge.menuthere.com`,
    });
    return {
      ok: false,
      message: `porter account inactive for ${partnerMobile}`,
    };
  }

  // 3. Build pickup + drop.
  const pickupLatLng = extractLatLng(order.partner.geo_location);
  const dropLatLng = extractLatLng(order.delivery_location);
  if (!pickupLatLng) {
    await persistProvider(orderId, "failed", null, {
      error: "partner.geo_location missing — cannot quote without pickup coords",
    });
    return { ok: false, message: "partner geo_location missing" };
  }
  if (!dropLatLng) {
    await persistProvider(orderId, "failed", null, {
      error: "order.delivery_location missing — customer address has no coords",
    });
    return { ok: false, message: "order delivery_location missing" };
  }
  const customerMobile = normaliseMobile(order.user?.phone ?? order.phone);
  if (!customerMobile) {
    await persistProvider(orderId, "failed", null, {
      error: "customer phone missing — Porter needs a number to dispatch to",
    });
    return { ok: false, message: "customer phone missing" };
  }

  // 4. Quote (2-wheeler).
  const quote = await bridgeFetch(`/api/v1/porter/quote`, {
    method: "POST",
    json: {
      accountId: account._id,
      pickup: pickupLatLng,
      drop: dropLatLng,
      paymentMode: "cash",
      serviceType: "TWO_WHEELER",
      vehicleIds: [97],
    },
  });
  if (!quote.ok) {
    await persistProvider(orderId, "failed", null, {
      error: `quote failed: ${quote.message}`,
    });
    return quote;
  }
  const quotes = (quote.data.quotes ?? []) as Array<{
    vehicleId: number;
    quotationUuid: string;
    fare: number;
    couponCode: string | null;
  }>;
  const wheeler =
    quotes.find((q) => q.vehicleId === 97) ?? quotes[0];
  if (!wheeler) {
    await persistProvider(orderId, "failed", null, {
      error: "no 2-wheeler quote returned",
    });
    return { ok: false, message: "no 2-wheeler available" };
  }

  // 5. Book.
  const pickupTitle = order.partner.store_name || "Restaurant";
  const pickupSubtitle = order.partner.location || "Pickup";
  const dropTitle = order.user?.full_name?.trim() || "Customer";
  const dropSubtitle =
    order.delivery_address?.trim().slice(0, 200) || "Delivery";

  // Pickup note = first 8 chars of the order UUID. Short, unique enough
  // for the rider to read aloud over the phone, and Porter strips funky
  // characters anyway so we keep it plain.
  const pickupNote = orderId.slice(0, 8);

  // The pickup contact's phone is the *restaurant's* number, not the
  // partner's porter-login mobile — riders call this to coordinate
  // arrival. We fall back to porter-mobile only if the restaurant has
  // no phone on file.
  const restaurantPhone =
    normaliseMobile(order.partner.phone) ?? partnerMobile;

  const book = await bridgeFetch(`/api/v1/porter/book`, {
    method: "POST",
    json: {
      accountId: account._id,
      quotationUuid: wheeler.quotationUuid,
      vehicleId: wheeler.vehicleId,
      paymentMode: "cash",
      couponCode: wheeler.couponCode ?? undefined,
      pickup: pickupLatLng,
      drop: dropLatLng,
      pickupAddress: { title: pickupTitle, subtitle: pickupSubtitle },
      dropAddress: { title: dropTitle, subtitle: dropSubtitle },
      pickupContact: { name: pickupTitle, phone: restaurantPhone },
      receiverContact: { name: dropTitle, phone: customerMobile },
      pickupNote,
      // dropNote intentionally omitted — Porter's rider screen already
      // shows the drop address; nothing extra is useful right now.
      pickupInMins: 6,
    },
  });
  if (!book.ok) {
    await persistProvider(orderId, "failed", null, {
      error: `book failed: ${book.message}`,
      quotationUuid: wheeler.quotationUuid,
    });
    return book;
  }

  const booking = book.data as {
    bookingId: string;
    crn: string;
    status: string;
    fareAmount: number;
    paymentMode: string;
    shareText?: string;
    consignmentNotePdfUrl?: string;
  };
  await persistProvider(orderId, booking.status, booking.crn, {
    accountId: account._id,
    porterBookingId: booking.bookingId,
    fareAmount: booking.fareAmount,
    paymentMode: booking.paymentMode,
    shareText: booking.shareText ?? null,
    consignmentNotePdfUrl: booking.consignmentNotePdfUrl ?? null,
    quotedFare: wheeler.fare,
    couponCode: wheeler.couponCode ?? null,
    pickup: pickupLatLng,
    drop: dropLatLng,
  });

  return { ok: true, data: booking };
}

/**
 * Quick fare quote for the customer checkout modals. No booking — just the
 * 2-wheeler fare from Porter so PlaceOrderModal can show it as the delivery
 * charge and collect that amount from the customer. The quotation_uuid is
 * NOT persisted: dispatch re-quotes at accept-time, so prices stay fresh
 * even if the customer takes a while to confirm.
 *
 * Returns { fare, etaMins } on success, or { ok: false, message } if the
 * partner isn't onboarded / isn't serviceable / Porter rejects the quote.
 */
export async function quotePorterFare(input: {
  partnerId: string;
  drop: { lat: number; lng: number };
  paymentMode?: "cash" | "wallet";
}): Promise<Result> {
  if (!input.partnerId) return { ok: false, message: "partnerId required" };
  if (
    !input.drop ||
    typeof input.drop.lat !== "number" ||
    typeof input.drop.lng !== "number"
  ) {
    return { ok: false, message: "drop coords required" };
  }

  // Load just the bits we need from the partner.
  let partner: {
    geo_location: { coordinates: [number, number] } | null;
    phone: string | null;
    porter_mobile: string | null;
    feature_flags: string | null;
  };
  try {
    const data = await fetchFromHasura(
      `query PartnerForPorterQuote($id: uuid!) {
        partners_by_pk(id: $id) {
          geo_location
          phone
          porter_mobile
          feature_flags
        }
      }`,
      { id: input.partnerId },
    );
    if (!data.partners_by_pk) return { ok: false, message: "partner not found" };
    partner = data.partners_by_pk;
  } catch (err) {
    return { ok: false, message: `hasura: ${(err as Error).message}` };
  }

  // Quick gate: don't make a porter-bridge call if the flag isn't on. Lets
  // the modal call this unconditionally without extra branches.
  if (!partner.feature_flags?.includes("porter_bridge-true")) {
    return { ok: false, status: 404, message: "porter_bridge not enabled" };
  }

  const pickup = extractLatLng(partner.geo_location);
  if (!pickup) return { ok: false, message: "partner pickup coords missing" };

  const partnerMobile =
    normaliseMobile(partner.porter_mobile) ?? normaliseMobile(partner.phone);
  if (!partnerMobile) {
    return { ok: false, message: "partner has no porter mobile to resolve" };
  }

  const lookup = await bridgeFetch(
    `/api/v1/accounts/by-mobile/${partnerMobile}`,
    { method: "GET" },
  );
  if (!lookup.ok) return lookup;
  const account = lookup.data as {
    _id: string;
    status: string;
    hasAuthToken: boolean;
  };
  if (account.status !== "active" || !account.hasAuthToken) {
    return {
      ok: false,
      status: 409,
      message:
        "porter account not active — partner needs to OTP-login at deliverybridge.menuthere.com",
    };
  }

  const quote = await bridgeFetch(`/api/v1/porter/quote`, {
    method: "POST",
    json: {
      accountId: account._id,
      pickup,
      drop: input.drop,
      paymentMode: input.paymentMode ?? "cash",
      serviceType: "TWO_WHEELER",
      vehicleIds: [97],
    },
  });
  if (!quote.ok) return quote;

  const quotes = (quote.data.quotes ?? []) as Array<{
    vehicleId: number;
    quotationUuid: string;
    fare: number;
    couponCode: string | null;
    etaMins: number;
    totalDiscount: number;
  }>;
  const wheeler =
    quotes.find((q) => q.vehicleId === 97) ?? quotes[0];
  if (!wheeler) {
    return { ok: false, message: "no 2-wheeler quote available" };
  }

  return {
    ok: true,
    data: {
      fare: wheeler.fare,
      etaMins: wheeler.etaMins,
      couponCode: wheeler.couponCode ?? null,
      totalDiscount: wheeler.totalDiscount,
      vehicleId: wheeler.vehicleId,
      // We DON'T return quotation_uuid — dispatch must re-quote at accept
      // time to avoid using an expired one.
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Multi-provider DISPATCH (delivery-bridge sequence)
//
// For partners on the `porter_bridge` flag we now run the bridge's sequential
// dispatch (Porter → Uber → Rapido, in the partner's configured priority)
// using NORMAL BIKE instead of a Porter-only parcel book. The bridge resolves
// each provider's account from the partner's mobile and books one at a time,
// cancelling-and-escalating on timeout. The customer is charged the MAX of the
// providers' quotes so the fee covers whichever one actually gets the rider.
// ──────────────────────────────────────────────────────────────────────────

const PERSIST_DISPATCH_MUTATION = `
  mutation PersistDispatchState(
    $id: uuid!, $provider: String!, $state: String!, $orderId: String, $meta: jsonb!, $now: timestamptz!
  ) {
    update_orders_by_pk(
      pk_columns: { id: $id },
      _set: {
        delivery_provider: $provider,
        delivery_provider_state: $state,
        delivery_provider_order_id: $orderId,
        delivery_provider_last_event_at: $now
      },
      _append: { delivery_provider_meta: $meta }
    ) { id }
  }
`;

async function persistDispatch(
  orderId: string,
  provider: string,
  state: string,
  providerOrderId: string | null,
  meta: Record<string, unknown>,
): Promise<void> {
  try {
    await fetchFromHasura(PERSIST_DISPATCH_MUTATION, {
      id: orderId,
      provider,
      state,
      orderId: providerOrderId,
      meta,
      now: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[delivery-bridge] persistDispatch failed:", err);
  }
}

interface PartnerDispatchCfg {
  /** Base/default mobile (porter_mobile ?? phone): pickup contact + per-provider fallback. */
  mobile: string;
  /** Per-provider mobiles — a partner may have logged into each service with a
   *  different number. Each falls back to `mobile` when its own column is unset. */
  mobiles: { porter: string; uber: string; rapido: string };
  pickup: { lat: number; lng: number };
  storeName: string;
  priority: string[] | undefined;
  enabled: boolean;
}

async function loadPartnerDispatchCfg(
  partnerId: string,
): Promise<{ ok: true; cfg: PartnerDispatchCfg } | { ok: false; status?: number; message: string }> {
  let p: {
    store_name: string | null;
    geo_location: { coordinates: [number, number] } | null;
    phone: string | null;
    porter_mobile: string | null;
    uber_mobile: string | null;
    rapido_mobile: string | null;
    feature_flags: string | null;
    delivery_rules: { delivery_provider_priority?: unknown } | null;
  } | null;
  try {
    const data = await fetchFromHasura(
      `query PartnerForDispatch($id: uuid!) {
        partners_by_pk(id: $id) {
          store_name geo_location phone porter_mobile uber_mobile rapido_mobile feature_flags delivery_rules
        }
      }`,
      { id: partnerId },
    );
    p = data.partners_by_pk;
  } catch (err) {
    return { ok: false, message: `hasura: ${(err as Error).message}` };
  }
  if (!p) return { ok: false, message: "partner not found" };
  const enabled = Boolean(p.feature_flags?.includes("porter_bridge-true"));
  const pickup = extractLatLng(p.geo_location);
  // Base mobile = porter_mobile ?? phone. Each provider may override with its
  // own number (the partner can have separate Porter/Uber/Rapido logins); an
  // unset provider mobile falls back to this base.
  const mobile = normaliseMobile(p.porter_mobile) ?? normaliseMobile(p.phone);
  if (!pickup) return { ok: false, message: "partner pickup coords missing" };
  if (!mobile) return { ok: false, message: "partner has no delivery mobile to resolve" };
  const mobiles = {
    porter: normaliseMobile(p.porter_mobile) ?? mobile,
    uber: normaliseMobile(p.uber_mobile) ?? mobile,
    rapido: normaliseMobile(p.rapido_mobile) ?? mobile,
  };
  const pri = p.delivery_rules?.delivery_provider_priority;
  const priority = Array.isArray(pri) && pri.length ? pri.map(String) : undefined;
  return {
    ok: true,
    cfg: { mobile, mobiles, pickup, storeName: p.store_name ?? "Store", priority, enabled },
  };
}

/**
 * Multi-provider quote (NORMAL BIKE) for the checkout. Returns the MAX fare
 * across the partner's available providers — what we charge the customer.
 * Drop-in replacement for quotePorterFare; same `{ fare, etaMins? }` shape.
 */
export async function quoteDeliveryFare(input: {
  partnerId: string;
  drop: { lat: number; lng: number };
  paymentMode?: "cash" | "wallet";
}): Promise<Result> {
  if (!input.partnerId) return { ok: false, message: "partnerId required" };
  if (!input.drop || typeof input.drop.lat !== "number" || typeof input.drop.lng !== "number") {
    return { ok: false, message: "drop coords required" };
  }
  const c = await loadPartnerDispatchCfg(input.partnerId);
  if (!c.ok) return c;
  if (!c.cfg.enabled) return { ok: false, status: 404, message: "delivery bridge not enabled" };

  const res = await bridgeFetch(`/api/v1/dispatch/quote`, {
    method: "POST",
    json: {
      mobile: c.cfg.mobile,
      mobiles: c.cfg.mobiles,
      vehicleMode: "bike",
      priority: c.cfg.priority,
      paymentMode: input.paymentMode ?? "cash",
      pickup: c.cfg.pickup,
      drop: input.drop,
    },
  });
  if (!res.ok) return res;
  const data = res.data as {
    maxFare: number | null;
    available: boolean;
    quotes: Array<{ provider: string; available: boolean; fare?: number; etaMins?: number | null }>;
    best: { provider: string; fare: number } | null;
  };
  if (!data.available || data.maxFare == null) {
    return { ok: false, status: 409, message: "no delivery provider available for this route" };
  }
  const bestQ = data.quotes.find((q) => q.provider === data.best?.provider);
  return {
    ok: true,
    data: {
      fare: data.maxFare,
      etaMins: bestQ?.etaMins ?? null,
      provider: data.best?.provider ?? null,
      breakdown: data.quotes,
    },
  };
}

/**
 * Fire the sequential dispatch for an order that just hit `accepted`. Returns
 * a dispatchId immediately; the bridge books/escalates server-side and
 * getDispatchTracking() reconciles the won provider/rider onto the order.
 */
export async function dispatchViaDeliveryBridge(orderId: string): Promise<Result> {
  if (!orderId) return { ok: false, message: "orderId required" };
  let order: OrderForDispatch;
  try {
    const data = await fetchFromHasura(ORDER_FOR_DISPATCH_QUERY, { id: orderId });
    order = data.orders_by_pk as OrderForDispatch;
  } catch (err) {
    return { ok: false, message: `hasura: ${(err as Error).message}` };
  }
  if (!order) return { ok: false, message: `order ${orderId} not found` };
  if (!order.partner) return { ok: false, message: `partner missing on order ${orderId}` };

  const c = await loadPartnerDispatchCfg(order.partner_id);
  if (!c.ok) {
    await persistDispatch(orderId, "dispatch", "failed", null, { error: c.message });
    return c;
  }
  if (!c.cfg.enabled) return { ok: false, status: 404, message: "delivery bridge not enabled" };

  const drop = extractLatLng(order.delivery_location);
  if (!drop) {
    await persistDispatch(orderId, "dispatch", "failed", null, { error: "order drop coords missing" });
    return { ok: false, message: "order drop coords missing" };
  }
  const customerName = order.user?.full_name || "Customer";
  const customerPhone =
    normaliseMobile(order.phone) ?? normaliseMobile(order.user?.phone) ?? c.cfg.mobile;

  const res = await bridgeFetch(`/api/v1/dispatch`, {
    method: "POST",
    json: {
      mobile: c.cfg.mobile,
      mobiles: c.cfg.mobiles,
      vehicleMode: "bike",
      priority: c.cfg.priority,
      paymentMode: "cash",
      pickup: {
        lat: c.cfg.pickup.lat,
        lng: c.cfg.pickup.lng,
        title: c.cfg.storeName,
        contactName: c.cfg.storeName,
        contactPhone: c.cfg.mobile,
      },
      drop: {
        lat: drop.lat,
        lng: drop.lng,
        title: order.delivery_address ?? "Customer",
        contactName: customerName,
        contactPhone: customerPhone,
        note: order.display_id ? `Order #${order.display_id}` : undefined,
      },
    },
  });
  if (!res.ok) {
    await persistDispatch(orderId, "dispatch", "failed", null, { error: res.message });
    return res;
  }
  const dispatchId = String((res.data as { dispatchId?: string }).dispatchId ?? "");
  await persistDispatch(orderId, "dispatch", "running", dispatchId, {
    dispatchId,
    vehicleMode: "bike",
    priority: c.cfg.priority ?? null,
  });
  return { ok: true, data: { dispatchId } };
}

/**
 * Poll the dispatch + reconcile the order. Once a provider wins, flips
 * delivery_provider to that provider (porter/uber/rapido) so the existing
 * tracking UI lights up; stores trackUrl + driver into meta.
 */
export async function getDispatchTracking(orderId: string): Promise<Result> {
  if (!orderId) return { ok: false, message: "orderId required" };
  let dispatchId: string | null = null;
  try {
    const data = await fetchFromHasura(
      `query GetDispatchId($id: uuid!) {
        orders_by_pk(id: $id) { delivery_provider delivery_provider_meta }
      }`,
      { id: orderId },
    );
    dispatchId = data.orders_by_pk?.delivery_provider_meta?.dispatchId ?? null;
  } catch (err) {
    return { ok: false, message: `hasura: ${(err as Error).message}` };
  }
  if (!dispatchId) return { ok: false, status: 404, message: "no dispatch on this order" };

  const res = await bridgeFetch(`/api/v1/dispatch/${dispatchId}`, { method: "GET" });
  if (!res.ok) return res;
  const d = res.data as {
    status: string;
    result: { provider?: string } | null;
    booking: {
      provider?: string;
      ref?: string;
      status?: string;
      driver?: unknown;
      trackUrl?: string | null;
    } | null;
  };
  const b = d.booking;
  // While running keep provider = "dispatch"; once a booking exists switch to
  // the real provider so the existing tracking panel renders it.
  const provider = b?.provider ?? d.result?.provider ?? "dispatch";
  const state = b?.status ?? (d.status === "assigned" ? "assigned" : d.status);
  await persistDispatch(orderId, provider, state, b?.ref ?? dispatchId, {
    dispatchId,
    dispatchStatus: d.status,
    ...(b?.trackUrl ? { trackUrl: b.trackUrl, consignmentNotePdfUrl: b.trackUrl } : {}),
    ...(b?.driver ? { driver: b.driver } : {}),
  });
  return { ok: true, data: { dispatchStatus: d.status, provider, booking: b } };
}

/** Cancel a dispatched order's delivery (stops the sequence and/or cancels the
 *  won provider's booking via the bridge). Falls back to the legacy Porter
 *  cancel for orders booked before the dispatch switch. */
export async function cancelDispatch(orderId: string, _reason?: string): Promise<Result> {
  if (!orderId) return { ok: false, message: "orderId required" };
  let dispatchId: string | null = null;
  let provider: string | null = null;
  try {
    const data = await fetchFromHasura(
      `query GetDispatchForCancel($id: uuid!) {
        orders_by_pk(id: $id) { delivery_provider delivery_provider_meta }
      }`,
      { id: orderId },
    );
    const o = data.orders_by_pk;
    provider = o?.delivery_provider ?? null;
    dispatchId = o?.delivery_provider_meta?.dispatchId ?? null;
  } catch (err) {
    return { ok: false, message: `hasura: ${(err as Error).message}` };
  }
  // Legacy Porter-only orders (booked before the dispatch switch) → old path.
  if (!dispatchId) {
    if (provider === "porter") return cancelPorter(orderId, _reason ?? "Cancelled");
    return { ok: false, status: 404, message: "no dispatch on this order" };
  }
  const res = await bridgeFetch(`/api/v1/dispatch/${dispatchId}/cancel`, {
    method: "POST",
    json: {},
  });
  if (res.ok) {
    await persistDispatch(orderId, provider ?? "dispatch", "cancelled", null, {
      cancelledAt: new Date().toISOString(),
    });
  }
  return res;
}

/**
 * Read the latest status of a Porter booking. Used by the public order
 * page and admin OrderDetails to refresh driver info + status without
 * polling Porter from the client.
 *
 * Lazily updates the order row when the upstream state has moved.
 */
export async function getPorterTracking(orderId: string): Promise<Result> {
  if (!orderId) return { ok: false, message: "orderId required" };

  let crn: string | null = null;
  let porterAccountId: string | null = null;
  try {
    const data = await fetchFromHasura(
      `query GetCrn($id: uuid!) {
        orders_by_pk(id: $id) {
          delivery_provider
          delivery_provider_order_id
          delivery_provider_meta
        }
      }`,
      { id: orderId },
    );
    const o = data.orders_by_pk;
    if (!o || o.delivery_provider !== "porter") {
      return { ok: false, status: 404, message: "no porter booking on this order" };
    }
    crn = o.delivery_provider_order_id;
    porterAccountId = o.delivery_provider_meta?.accountId ?? null;
  } catch (err) {
    return { ok: false, message: `hasura: ${(err as Error).message}` };
  }
  if (!crn) {
    return { ok: false, status: 404, message: "porter order not yet booked" };
  }

  const qs = porterAccountId ? `?accountId=${porterAccountId}` : "";
  const res = await bridgeFetch(`/api/v1/porter/order/${crn}${qs}`, {
    method: "GET",
  });
  if (!res.ok) return res;

  // Mirror the upstream state into our order row so the dashboard's
  // existing Convex/Hasura subscription updates without a forced refresh.
  const o = res.data as {
    status: string;
    driver?: { name?: string; phone?: string; vehicleNumber?: string };
    fareAmount?: number;
    shareText?: string;
  };
  await persistProvider(orderId, o.status, crn, {
    ...(res.data as Record<string, unknown>),
  });
  return res;
}

/**
 * Cancel an active Porter booking when the order is cancelled locally.
 * Idempotent: returns ok=false with status=404 if there was no porter
 * booking to begin with (caller can ignore that).
 */
export async function cancelPorter(
  orderId: string,
  reason: string,
): Promise<Result> {
  if (!orderId) return { ok: false, message: "orderId required" };

  let crn: string | null = null;
  let accountId: string | null = null;
  let fallbackMobile: string | null = null;
  try {
    const data = await fetchFromHasura(
      `query GetCrn($id: uuid!) {
        orders_by_pk(id: $id) {
          delivery_provider
          delivery_provider_order_id
          delivery_provider_meta
          delivery_provider_state
          partner {
            phone
            porter_mobile
          }
        }
      }`,
      { id: orderId },
    );
    const o = data.orders_by_pk;
    if (!o || o.delivery_provider !== "porter") {
      return { ok: false, status: 404, message: "no porter booking" };
    }
    if (o.delivery_provider_state === "cancelled") {
      return { ok: true, data: { alreadyCancelled: true } };
    }
    crn = o.delivery_provider_order_id;
    accountId = o.delivery_provider_meta?.accountId ?? null;
    fallbackMobile =
      normaliseMobile(o.partner?.porter_mobile) ??
      normaliseMobile(o.partner?.phone);
  } catch (err) {
    return { ok: false, message: `hasura: ${(err as Error).message}` };
  }
  if (!crn) {
    return { ok: false, status: 404, message: "porter booking missing CRN" };
  }

  // Fallback: legacy rows persisted before the meta-merge fix may have lost
  // accountId. Look it up by partner mobile so cancel still works.
  if (!accountId && fallbackMobile) {
    const lookup = await bridgeFetch(
      `/api/v1/accounts/by-mobile/${fallbackMobile}`,
      { method: "GET" },
    );
    if (lookup.ok) {
      accountId = (lookup.data as { _id: string })._id;
    }
  }
  if (!accountId) {
    return {
      ok: false,
      status: 404,
      message:
        "porter booking has no accountId in meta and no partner mobile to resolve — cancel manually via deliverybridge.menuthere.com",
    };
  }

  const res = await bridgeFetch(`/api/v1/porter/cancel`, {
    method: "POST",
    json: {
      accountId,
      crn,
      reasonId: 135,
      comment: reason.slice(0, 500) || "Cancelled from menuthere",
    },
  });
  if (res.ok) {
    await persistProvider(orderId, "cancelled", crn, {
      accountId,
      cancelledReason: reason,
      cancelledAt: new Date().toISOString(),
    });
  }
  return res;
}
