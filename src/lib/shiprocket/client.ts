// SERVER-ONLY Shiprocket HTTP client. A PLAIN module, not "use server" — see the
// header of ./creds.ts for why that distinction matters.
//
// Shiprocket has no sandbox. Their own docs say: "Any requests made using the valid
// API credentials will affect the real-time data in your Shiprocket account." Every
// call here spends a real merchant's wallet, so nothing in this file retries a
// non-idempotent write.
//
// Contract: NOTHING here throws. Every path returns SrResult, because these calls
// run inside fire-and-forget dispatch where a thrown error is an unhandled rejection
// nobody sees.

import {
  clearCachedToken,
  fetchShiprocketCredRowOrNull,
  isShiprocketEnabled,
  readMemoToken,
  recordShiprocketError,
  tokenFromRow,
  writeCachedToken,
  credsFromRow,
} from "./creds";
import type { ShiprocketPickupLocation } from "./types";

if (typeof window !== "undefined") {
  throw new Error("src/lib/shiprocket/client.ts is server-only.");
}

export const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

/**
 * The trailing slash is REQUIRED on serviceability — Shiprocket's router 404s the
 * unslashed form. Kept as a constant so nobody "tidies" it away.
 */
export const PATH_SERVICEABILITY = "/courier/serviceability/";

export type SrErrorCode =
  | "auth"
  | "not_configured"
  | "validation"
  | "rate_limit"
  | "network"
  | "server"
  | "unknown";

export type SrResult<T = any> =
  | { ok: true; data: T }
  | { ok: false; status?: number; code: SrErrorCode; message: string };

const TIMEOUT_MS = 20_000;

function fail(code: SrErrorCode, message: string, status?: number): SrResult<never> {
  return { ok: false, code, message, status };
}

/** Turn whatever Shiprocket sent back into a message a merchant can act on. */
function readableError(status: number, body: any, fallbackPath: string): string {
  if (typeof body === "string" && body.trim() && !body.trim().startsWith("<")) {
    return body.trim().slice(0, 300);
  }
  const msg = body?.message ?? body?.error ?? null;
  // 422 carries a per-field map: { errors: { billing_pincode: ["..."] } }
  const errs = body?.errors;
  if (errs && typeof errs === "object") {
    const flat = Object.entries(errs)
      .map(([field, v]) => `${field}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
      .join("; ");
    if (flat) return (msg ? `${msg} — ${flat}` : flat).slice(0, 300);
  }
  if (typeof msg === "string" && msg.trim()) return msg.trim().slice(0, 300);
  return `HTTP ${status} on ${fallbackPath}`;
}

function codeForStatus(status: number): SrErrorCode {
  if (status === 401 || status === 403) return "auth";
  if (status === 422 || status === 400) return "validation";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "server";
  return "unknown";
}

/**
 * One raw HTTP call. Tolerates non-JSON bodies on purpose: Shiprocket leaks raw
 * PHP errors and nginx HTML on 5xx, and res.json() on those throws inside a
 * fire-and-forget dispatch where nobody is listening.
 */
async function rawFetch(
  path: string,
  init: { method?: string; token?: string | null; json?: unknown; query?: Record<string, string | number | undefined> },
): Promise<SrResult> {
  const qs = init.query
    ? "?" +
      Object.entries(init.query)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";

  let res: Response;
  try {
    res = await fetch(`${SHIPROCKET_BASE}${path}${qs}`, {
      method: init.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    const msg = (err as Error)?.name === "TimeoutError"
      ? `Shiprocket did not respond within ${TIMEOUT_MS / 1000}s`
      : `network: ${(err as Error)?.message ?? "request failed"}`;
    return fail("network", msg);
  }

  const text = await res.text().catch(() => "");
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    return fail(codeForStatus(res.status), readableError(res.status, body, path), res.status);
  }
  return { ok: true, data: body ?? {} };
}

/** Read a JWT's `exp` without verifying it — we only need the expiry, not trust. */
function jwtExpiry(token: string): Date | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const exp = JSON.parse(json)?.exp;
    if (typeof exp !== "number") return null;
    const d = new Date(exp * 1000);
    return d.getTime() > Date.now() ? d : null;
  } catch {
    return null;
  }
}

/**
 * Exchange an API user's email + password for a JWT.
 *
 * Shiprocket documents the token as valid for 10 days and returns no expiry field,
 * so we decode `exp` off the JWT itself and only fall back to 9 days if that fails.
 * Several widely-copied third-party guides claim 24 hours; they are wrong, and
 * trusting them would mean re-authenticating ten times more often than necessary.
 */
export async function shiprocketLogin(
  email: string,
  password: string,
): Promise<SrResult<{ token: string; expiresAt: Date }>> {
  const res = await rawFetch("/auth/login", { method: "POST", json: { email, password } });
  if (!res.ok) {
    // Shiprocket answers a bad password with 400/422, not 401 — restate it so the
    // merchant is not told their input was malformed when it was simply wrong.
    if (res.status === 400 || res.status === 422 || res.status === 401 || res.status === 403) {
      return fail(
        "auth",
        "Shiprocket rejected these credentials. Check the API user's email and password (Settings → API in Shiprocket).",
        res.status,
      );
    }
    return res;
  }
  const token = (res.data as any)?.token;
  if (typeof token !== "string" || !token) {
    return fail("auth", "Shiprocket did not return a token for these credentials.");
  }
  const expiresAt = jwtExpiry(token) ?? new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
  return { ok: true, data: { token, expiresAt } };
}

/**
 * A valid token for a partner, logging in only when the cache is cold or stale.
 *
 * `gated` (the default) refuses when the shiprocket flag is off. The connection
 * test passes false: the whole point of testing is to verify credentials BEFORE
 * the partner is allowed to switch the feature on.
 */
export async function getShiprocketToken(
  partnerId: string,
  opts: { gated?: boolean } = {},
): Promise<SrResult<string>> {
  const gated = opts.gated !== false;

  // In-process cache first. One dispatch makes four authenticated calls
  // (create → AWB → pickup → label); without this each one would re-read the
  // credential row from Hasura and re-run an AES-GCM decrypt for a token it
  // already holds.
  const memoised = readMemoToken(partnerId);
  if (memoised) return { ok: true, data: memoised };

  // OrNull: this module's contract is that nothing throws — every path returns an
  // SrResult, because these calls run inside fire-and-forget dispatch.
  const row = await fetchShiprocketCredRowOrNull(partnerId);
  if (!row) return fail("not_configured", "Shiprocket is not set up for this store.");

  // Check the flag ONCE, with a cheap flags-only query — not by re-reading and
  // re-decrypting the whole credential row, which is what the password path does.
  if (gated && !(await isShiprocketEnabled(partnerId))) {
    return fail("not_configured", "Shiprocket is not enabled for this store.");
  }

  const cached = tokenFromRow(row, partnerId);
  if (cached) return { ok: true, data: cached };

  const creds = credsFromRow(row, partnerId);
  if (!creds) {
    return fail(
      "not_configured",
      gated
        ? "Shiprocket is not enabled, or its credentials are missing."
        : "Shiprocket credentials are missing or could not be decrypted.",
    );
  }

  const login = await shiprocketLogin(creds.email, creds.password);
  if (!login.ok) {
    await recordShiprocketError(partnerId, login.message);
    return login;
  }
  await writeCachedToken(partnerId, login.data.token, login.data.expiresAt);
  return { ok: true, data: login.data.token };
}

/**
 * Authenticated call with a single re-auth retry on 401.
 *
 * The retry is not optional. Shiprocket returns the same 401 for "your token
 * expired" and "your password is wrong", and gives no way to tell them apart, so
 * the only way to know which happened is to log in again and see. `idempotent`
 * guards the difference: a GET can safely be replayed, but replaying a
 * create-order would bill the merchant twice, so for writes we refresh the token
 * and report failure rather than re-sending.
 */
export async function srFetch<T = any>(
  partnerId: string,
  path: string,
  init: {
    method?: string;
    json?: unknown;
    query?: Record<string, string | number | undefined>;
    gated?: boolean;
    /** Safe to replay after a token refresh. Default true for GET, false otherwise. */
    idempotent?: boolean;
  } = {},
): Promise<SrResult<T>> {
  const method = init.method ?? "GET";
  const replayable = init.idempotent ?? method.toUpperCase() === "GET";

  const tok = await getShiprocketToken(partnerId, { gated: init.gated });
  if (!tok.ok) return tok;

  const first = await rawFetch(path, {
    method,
    token: tok.data,
    json: init.json,
    query: init.query,
  });
  if (first.ok || first.code !== "auth") return first as SrResult<T>;

  // 401 — drop the token and get a fresh one.
  await clearCachedToken(partnerId);
  const fresh = await getShiprocketToken(partnerId, { gated: init.gated });
  if (!fresh.ok) {
    await recordShiprocketError(partnerId, fresh.message);
    return fresh;
  }
  if (!replayable) {
    return fail(
      "auth",
      "Shiprocket rejected the request and the session was refreshed. Nothing was sent twice — try again.",
      401,
    );
  }
  const second = await rawFetch(path, {
    method,
    token: fresh.data,
    json: init.json,
    query: init.query,
  });
  if (!second.ok && second.code === "auth") {
    await recordShiprocketError(
      partnerId,
      "Shiprocket rejected the stored credentials. Re-enter the API user password.",
    );
  }
  return second as SrResult<T>;
}

// ── Endpoint wrappers ──────────────────────────────────────────────────────

/**
 * The partner's pickup locations. Doubles as the connection test: it is a cheap
 * authenticated GET, and its result is exactly what the settings screen needs to
 * offer a pickup dropdown instead of a free-text box.
 */
export async function listPickupLocations(
  partnerId: string,
  opts: { gated?: boolean } = {},
): Promise<SrResult<ShiprocketPickupLocation[]>> {
  const res = await srFetch<any>(partnerId, "/settings/company/pickup", {
    gated: opts.gated,
  });
  if (!res.ok) return res;
  // Shiprocket has shipped this as data.shipping_address[] and, on some accounts,
  // a bare data[]. Accept both rather than showing an empty dropdown to a partner
  // whose locations plainly exist.
  const raw = (res.data as any)?.data;
  const list: any[] = Array.isArray(raw?.shipping_address)
    ? raw.shipping_address
    : Array.isArray(raw)
      ? raw
      : [];
  return {
    ok: true,
    data: list.map((l) => ({
      nickname: String(l?.pickup_location ?? l?.nickname ?? "").trim(),
      city: l?.city ?? null,
      state: l?.state ?? null,
      pinCode: l?.pin_code != null ? String(l.pin_code) : null,
      // Shiprocket sends these as strings ("10.0410273"), and they are the only
      // trustworthy pickup point for a hyperlocal quote.
      // Same presence-before-coercion rule as parseShiprocketConfig: Shiprocket
      // sends "" or null for an address it never geocoded, and Number("") is 0.
      lat: l?.lat !== null && l?.lat !== undefined && l?.lat !== "" && Number.isFinite(Number(l.lat)) && Number(l.lat) !== 0 ? Number(l.lat) : null,
      lng: (() => {
        const raw = l?.long ?? l?.lng;
        return raw !== null && raw !== undefined && raw !== "" && Number.isFinite(Number(raw)) && Number(raw) !== 0 ? Number(raw) : null;
      })(),
      address: l?.address ?? null,
      phoneVerified: l?.phone_verified === 1 || l?.phone_verified === true,
    })).filter((l) => l.nickname),
  };
}

/** Courier options + rates for a parcel. */
export async function checkParcelServiceability(
  partnerId: string,
  q: {
    pickupPostcode: string;
    deliveryPostcode: string;
    cod: 0 | 1;
    weight: number;
    length?: number;
    breadth?: number;
    height?: number;
    declaredValue?: number;
  },
): Promise<SrResult<{ couriers: any[]; recommendedId: number | null }>> {
  const res = await srFetch<any>(partnerId, PATH_SERVICEABILITY, {
    query: {
      pickup_postcode: q.pickupPostcode,
      delivery_postcode: q.deliveryPostcode,
      cod: q.cod,
      weight: q.weight,
      length: q.length,
      breadth: q.breadth,
      height: q.height,
      declared_value: q.declaredValue,
    },
  });
  if (!res.ok) return res;
  const d = (res.data as any)?.data ?? {};
  return {
    ok: true,
    data: {
      couriers: Array.isArray(d.available_courier_companies) ? d.available_courier_companies : [],
      recommendedId:
        typeof d.recommended_courier_company_id === "number"
          ? d.recommended_courier_company_id
          : null,
    },
  };
}

/**
 * Hyperlocal (Shiprocket Quick) serviceability. Same path as parcel, but it needs
 * both ends' coordinates and answers with a completely different, much flatter
 * shape — hence a separate wrapper rather than a flag on the one above.
 */
export async function checkHyperlocalServiceability(
  partnerId: string,
  q: {
    pickupPostcode: string;
    deliveryPostcode: string;
    cod: 0 | 1;
    pickup: { lat: number; lng: number };
    drop: { lat: number; lng: number };
  },
): Promise<SrResult<{ couriers: Array<{ name: string; rate: number | null }> }>> {
  const res = await srFetch<any>(partnerId, PATH_SERVICEABILITY, {
    query: {
      pickup_postcode: q.pickupPostcode,
      delivery_postcode: q.deliveryPostcode,
      cod: q.cod,
      is_new_hyperlocal: 1,
      lat_from: q.pickup.lat,
      long_from: q.pickup.lng,
      lat_to: q.drop.lat,
      long_to: q.drop.lng,
    },
  });
  if (!res.ok) return res;
  const list = Array.isArray((res.data as any)?.data) ? (res.data as any).data : [];
  return {
    ok: true,
    data: {
      couriers: list.map((c: any) => ({
        name: String(c?.courier_name ?? "Shiprocket Quick"),
        rate: c?.rates != null && Number.isFinite(Number(c.rates)) ? Number(c.rates) : null,
      })),
    },
  };
}

/**
 * What Shiprocket currently thinks of an order we created.
 *
 * `cancelled` is the one that matters: an order cancelled IN THE SHIPROCKET PANEL
 * is invisible to us otherwise, and our row would go on resuming at the courier
 * step forever against an order that can never take one.
 */
export async function getOrderStatus(
  partnerId: string,
  srOrderId: string,
): Promise<SrResult<{ status: string | null; statusCode: number | null; cancelled: boolean }>> {
  const res = await srFetch<any>(partnerId, `/orders/show/${encodeURIComponent(srOrderId)}`);
  if (!res.ok) return res;
  const d = (res.data as any)?.data ?? res.data;
  const status = d?.status != null ? String(d.status) : null;
  const codeNum = Number(d?.status_code);
  const statusCode = Number.isFinite(codeNum) ? codeNum : null;
  // Both signals, because neither is documented: status_code 5 is what a cancel
  // produces today, and the label is spelled "CANCELED" (one L) — matching on
  // "cancel" covers either spelling if Shiprocket ever changes one of them.
  return {
    ok: true,
    data: { status, statusCode, cancelled: statusCode === 5 || /cancel/i.test(status ?? "") },
  };
}

/**
 * The couriers Shiprocket will actually accept for an order that already exists.
 *
 * Needed because the quote form of /courier/serviceability answers a hyperlocal
 * query with a nameplate ("Shiprocket Quick") and NO courier_company_id, while the
 * by-order form returns the real riders — PICO_EXPRESS_QUICK, Bharat, Quick-Mover —
 * each carrying an id we can assign. `is_hyperlocal` is the only field that
 * separates them from the parcel couriers in the same list.
 */
export async function listCouriersForOrder(
  partnerId: string,
  srOrderId: string,
): Promise<SrResult<Array<{ id: number; name: string; isHyperlocal: boolean; rate: number | null }>>> {
  const res = await srFetch<any>(partnerId, PATH_SERVICEABILITY, {
    query: { order_id: srOrderId },
  });
  if (!res.ok) return res;
  const list = (res.data as any)?.data?.available_courier_companies;
  if (!Array.isArray(list)) return fail("unknown", "Shiprocket returned no courier list for this order.");
  return {
    ok: true,
    data: list
      .filter((c: any) => Number.isFinite(Number(c?.courier_company_id)))
      .map((c: any) => ({
        id: Number(c.courier_company_id),
        name: String(c?.courier_name ?? "Courier"),
        isHyperlocal: c?.is_hyperlocal === true,
        rate: Number.isFinite(Number(c?.freight_charge ?? c?.rate))
          ? Number(c.freight_charge ?? c.rate)
          : null,
      })),
  };
}

/** Create the order. THE non-idempotent call — never replayed automatically. */
export async function createAdhocOrder(
  partnerId: string,
  payload: Record<string, unknown>,
): Promise<SrResult<{ orderId: string; shipmentId: string; status: string | null }>> {
  const res = await srFetch<any>(partnerId, "/orders/create/adhoc", {
    method: "POST",
    json: payload,
    idempotent: false,
  });
  if (!res.ok) return res;
  const d = res.data as any;
  const orderId = d?.order_id;
  const shipmentId = d?.shipment_id;
  if (orderId == null || shipmentId == null) {
    return fail("unknown", "Shiprocket accepted the order but returned no order/shipment id.");
  }
  return {
    ok: true,
    data: { orderId: String(orderId), shipmentId: String(shipmentId), status: d?.status ?? null },
  };
}

/** Assign a courier + AWB to a created shipment. */
export async function assignAwb(
  partnerId: string,
  shipmentId: string,
  courierId?: number | null,
): Promise<SrResult<{ awbCode: string | null; courierName: string | null; courierId: number | null }>> {
  const res = await srFetch<any>(partnerId, "/courier/assign/awb", {
    method: "POST",
    json: {
      shipment_id: shipmentId,
      ...(courierId ? { courier_id: courierId } : {}),
    },
    idempotent: false,
  });
  if (!res.ok) return res;
  // Shiprocket answers a FAILED assignment with HTTP 200 and an
  // `awb_assign_error` string — a success status with a failure inside it. That
  // string is nested under `response.data`, NOT at the top level; reading only the
  // top level marked every rejected assignment as a success and stored a null AWB
  // as if the parcel were on its way.
  const body = res.data as any;
  const d = body?.response?.data ?? body?.data ?? {};
  const assignError = d?.awb_assign_error ?? body?.awb_assign_error ?? body?.response?.awb_assign_error;
  if (assignError) {
    return fail("validation", String(assignError).slice(0, 300));
  }
  const awbCode = d?.awb_code != null && String(d.awb_code).trim() ? String(d.awb_code) : null;
  // No AWB and no error message is still a failure — the shipment has no courier.
  // Treating it as success is what would park an order at "Shipped · AWB null"
  // with no way to notice, so it fails loudly instead.
  if (!awbCode) {
    return fail(
      "validation",
      `Shiprocket accepted the request but assigned no AWB${
        courierId ? ` for courier ${courierId}` : " (no courier was named, so Shiprocket chose)"
      }. Usual causes: the chosen courier cannot serve this shipment (a parcel ` +
        "courier on a hyperlocal order returns exactly this), an empty wallet, an " +
        "unserviceable PIN code, or a pickup location whose phone is unverified.",
    );
  }
  return {
    ok: true,
    data: {
      awbCode,
      courierName: d?.courier_name ?? null,
      courierId: typeof d?.courier_company_id === "number" ? d.courier_company_id : null,
    },
  };
}

/** Ask the courier to collect. Safe to skip; the merchant can schedule in-panel. */
export async function requestPickup(
  partnerId: string,
  shipmentId: string,
): Promise<SrResult<any>> {
  return srFetch(partnerId, "/courier/generate/pickup", {
    method: "POST",
    json: { shipment_id: [Number(shipmentId) || shipmentId] },
    idempotent: false,
  });
}

/** Shipping label PDF. */
export async function generateLabel(
  partnerId: string,
  shipmentId: string,
): Promise<SrResult<{ labelUrl: string | null }>> {
  const res = await srFetch<any>(partnerId, "/courier/generate/label", {
    method: "POST",
    json: { shipment_id: [Number(shipmentId) || shipmentId] },
    idempotent: false,
  });
  if (!res.ok) return res;
  return { ok: true, data: { labelUrl: (res.data as any)?.label_url ?? null } };
}

/** Live tracking for an AWB. */
export async function trackAwb(partnerId: string, awb: string): Promise<SrResult<any>> {
  return srFetch(partnerId, `/courier/track/awb/${encodeURIComponent(awb)}`);
}

/**
 * Cancel an order at Shiprocket. Note this frees nothing on our side — the
 * order reference we sent stays burned forever and a re-ship must use a new one.
 */
export async function cancelShiprocketOrder(
  partnerId: string,
  srOrderId: string,
): Promise<SrResult<any>> {
  const res = await srFetch<any>(partnerId, "/orders/cancel", {
    method: "POST",
    json: { ids: [Number(srOrderId) || srOrderId] },
    idempotent: false,
    // NEVER gated. Cancelling is cleanup of something already paid for, not new
    // spend, and it has to keep working after the feature flag is switched off —
    // which is exactly when a partner is turning Shiprocket off BECAUSE something
    // went wrong and they are cancelling the parcels still in flight.
    gated: false,
  });
  if (!res.ok) return res;

  // Shiprocket answers a REFUSED cancel with HTTP 200 and the refusal in the body
  // ("Order already shipped", "cannot be cancelled"). Reading that as success told
  // the partner their parcel was withdrawn while a courier was still delivering it,
  // and cleared the error that would have shown otherwise.
  const body = res.data as any;
  const embedded = Number(body?.status_code);
  const msg = typeof body?.message === "string" ? body.message : "";
  if ((Number.isFinite(embedded) && embedded >= 400) || /cannot|could not|not.*cancel|already/i.test(msg)) {
    return fail("validation", (msg || "Shiprocket refused the cancellation.").slice(0, 300));
  }
  return res;
}

/** Wallet balance — a shipment fails once the merchant's wallet runs dry. */
export async function getWalletBalance(
  partnerId: string,
  opts: { gated?: boolean } = {},
): Promise<SrResult<{ balance: number | null }>> {
  const res = await srFetch<any>(partnerId, "/account/details/wallet-balance", {
    gated: opts.gated,
  });
  if (!res.ok) return res;
  const raw = (res.data as any)?.data?.balance_amount ?? (res.data as any)?.balance_amount;
  const n = Number(raw);
  return { ok: true, data: { balance: Number.isFinite(n) ? n : null } };
}
