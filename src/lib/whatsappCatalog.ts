import { deliveryBasePrice } from "@/lib/deliveryPricing";

/**
 * Menu → WhatsApp Business Catalogue.
 *
 * Publishes a partner's dishes as Meta Commerce products so customers can browse
 * and build a cart inside WhatsApp. Checkout still happens on the storefront: the
 * cart comes back through the `order` webhook and is handed over via the existing
 * `?ro=` reorder payload, which re-prices every line against the LIVE menu.
 *
 * That is the reason this file is allowed to be lossy. A catalogue entry is a
 * shop window, never a price of record — if it goes stale the customer sees a
 * stale listing and is still charged correctly. Nothing here may ever become the
 * number a customer pays.
 *
 * Scope, decided deliberately and not to be widened without revisiting the
 * handoff: no variants, no add-on groups. One catalogue product per menu row,
 * keyed by our own uuid.
 */

/** Graph API version. Kept local rather than shared so bumping the catalogue
 *  integration cannot silently change the messaging paths. */
const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

/** Meta rejects oversized batches; the documented ceiling is far higher, but a
 *  smaller window means one bad item fails a handful of rows instead of a whole
 *  menu, and 96k-row partners still finish in a few calls. */
export const CATALOG_BATCH_SIZE = 500;

export interface CatalogMenuItem {
  id: string;
  name?: string | null;
  description?: string | null;
  price?: number | string | null;
  delivery_price?: number | string | null;
  image_url?: string | null;
  is_available?: boolean | null;
  deletion_status?: number | null;
  stocks?: Array<{ stock_quantity?: number | null; show_stock?: boolean | null }> | null;
}

export interface CatalogPartner {
  id: string;
  username?: string | null;
  store_name?: string | null;
  currency?: string | null;
  wa_catalog_id?: string | null;
  delivery_rules?: { delivery_radius?: number | null } | null;
}

/** Why an item is not in the catalogue. Surfaced per-item in the admin so a
 *  missing dish has a cause instead of just being absent. */
export type SkipReason =
  | "no_image"
  | "no_price"
  | "no_name"
  | "deleted";

export const SKIP_REASON_TEXT: Record<SkipReason, string> = {
  no_image: "Add a photo — WhatsApp will not list an item without one.",
  no_price: "Set a price.",
  no_name: "Set a name.",
  deleted: "Removed from the menu.",
};

export interface CatalogProduct {
  retailer_id: string;
  name: string;
  description: string;
  availability: "in stock" | "out of stock";
  condition: "new";
  price: number;
  currency: string;
  image_url: string;
  url: string;
  brand: string;
}

export type BuildResult =
  | { ok: true; product: CatalogProduct }
  | { ok: false; reason: SkipReason };

/**
 * ISO currency for Meta. Our `currency` column stores a display SYMBOL (₹/$/€),
 * not a code — see the partner-row notes in CLAUDE.md — and Commerce requires
 * ISO 4217, so this maps the symbols we actually issue.
 */
const CURRENCY_BY_SYMBOL: Record<string, string> = {
  "₹": "INR",
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "د.إ": "AED",
  "ر.ق": "QAR",
  "ر.س": "SAR",
};

export function isoCurrency(symbol: string | null | undefined): string {
  const s = (symbol || "").trim();
  return CURRENCY_BY_SYMBOL[s] || "INR";
}

/**
 * Meta's batch endpoint takes price in the currency's MINOR unit as an integer
 * (₹210.50 → 21050), NOT a decimal.
 *
 * ⚠ Confirm this against a real catalogue on the first pilot partner before any
 * wider rollout: getting it wrong is silently off by 100x in the shop window,
 * which looks like a pricing scandal even though the charge is computed
 * elsewhere and stays correct.
 */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

/** Storefront deep link, so the catalogue entry has a "view on site" target. */
function itemUrl(partner: CatalogPartner, itemId: string): string {
  const base = `https://menuthere.com/${partner.username || ""}`;
  return `${base}?item=${encodeURIComponent(itemId)}`;
}

/**
 * One menu row → one catalogue product, or the reason it cannot be listed.
 *
 * Price comes from deliveryBasePrice(), not `price`: a catalogue order is remote
 * by nature, and that helper already treats a 0 in either column as "not set",
 * so a `delivery_price: 0` item cannot be advertised at ₹0.
 */
export function buildCatalogProduct(
  item: CatalogMenuItem,
  partner: CatalogPartner,
): BuildResult {
  if ((item.deletion_status ?? 0) !== 0) return { ok: false, reason: "deleted" };

  const name = (item.name || "").trim();
  if (!name) return { ok: false, reason: "no_name" };

  const image = (item.image_url || "").trim();
  if (!image) return { ok: false, reason: "no_image" };

  const price = deliveryBasePrice(item);
  if (!(price > 0)) return { ok: false, reason: "no_price" };

  // Meta requires a description; the dish name is a truthful fallback rather
  // than inventing copy for a restaurant.
  const description = (item.description || "").trim() || name;

  // Out-of-stock stays LISTED rather than being deleted: removing it loses the
  // product's history and its position in the customer's WhatsApp, and it comes
  // back in stock tomorrow. Availability is the field Meta gives us for exactly
  // this, so use it.
  const stock = item.stocks?.[0];
  const soldOut =
    item.is_available === false ||
    (stock?.stock_quantity != null && Number(stock.stock_quantity) <= 0);

  return {
    ok: true,
    product: {
      retailer_id: item.id,
      name: name.slice(0, 200),
      description: description.slice(0, 9999),
      availability: soldOut ? "out of stock" : "in stock",
      condition: "new",
      price: toMinorUnits(price),
      currency: isoCurrency(partner.currency),
      image_url: image,
      url: itemUrl(partner, item.id),
      brand: (partner.store_name || "Menu").slice(0, 100),
    },
  };
}

export interface BatchRequest {
  method: "UPDATE" | "DELETE";
  retailer_id: string;
  data?: Omit<CatalogProduct, "retailer_id">;
}

/** Split a menu into the catalogue writes it implies, plus the skips to report. */
export function planCatalogSync(
  items: CatalogMenuItem[],
  partner: CatalogPartner,
): { requests: BatchRequest[]; skipped: Array<{ id: string; reason: SkipReason }> } {
  const requests: BatchRequest[] = [];
  const skipped: Array<{ id: string; reason: SkipReason }> = [];

  for (const item of items) {
    const built = buildCatalogProduct(item, partner);
    if (!built.ok) {
      // A deleted item that was previously pushed has to be REMOVED from the
      // catalogue, not merely skipped, or WhatsApp keeps selling a dish the
      // restaurant took off the menu.
      if (built.reason === "deleted") {
        requests.push({ method: "DELETE", retailer_id: item.id });
      } else {
        skipped.push({ id: item.id, reason: built.reason });
      }
      continue;
    }
    const { retailer_id, ...data } = built.product;
    requests.push({ method: "UPDATE", retailer_id, data });
  }

  return { requests, skipped };
}

export function chunk<T>(arr: T[], size = CATALOG_BATCH_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface PushResult {
  ok: boolean;
  pushed: number;
  failed: number;
  errors: Array<{ retailer_id?: string; message: string }>;
  /** Async job ids Meta returns. EMPTY means nothing was queued. */
  handles: string[];
}

/**
 * Push one batch to Meta.
 *
 * `allow_upsert` so a first sync creates products rather than 404-ing on every
 * row — without it a new catalogue can only ever be updated, never populated.
 *
 * ⚠ /batch is ASYNCHRONOUS. A 200 means "queued", not "applied" — the body is
 * `{handles: [...]}` and the work lands seconds later. Measured on oreodemo: an
 * availability flip was still not visible 3s after a successful push, and only
 * appeared on the following read.
 *
 * So this function CANNOT tell you whether anything succeeded. Its `pushed` count
 * is "accepted for processing". Feed `handles` to awaitBatchHandles() for the
 * real answer, and do not record anything as synced until you have it.
 *
 * (An earlier version read `body.validation_status`, which this endpoint does not
 * return, so every push looked like a clean sweep — including one that rejected
 * every row.)
 */
export async function pushCatalogBatch(
  catalogId: string,
  accessToken: string,
  requests: BatchRequest[],
): Promise<PushResult> {
  if (!requests.length) return { ok: true, pushed: 0, failed: 0, errors: [], handles: [] };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${catalogId}/batch`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ allow_upsert: true, requests }),
        // A hung Graph call must not wedge a menu save.
        signal: AbortSignal.timeout(30_000),
      },
    );

    const body = await res.json().catch(() => ({} as any));

    if (!res.ok) {
      const msg =
        body?.error?.error_user_msg ||
        body?.error?.message ||
        `HTTP ${res.status}`;
      return {
        ok: false,
        pushed: 0,
        failed: requests.length,
        errors: [{ message: msg }],
        handles: [],
      };
    }

    // Some rows can be rejected synchronously on shape alone. Those are real
    // failures and are reported here; everything else is merely QUEUED.
    const rejected: Array<{ retailer_id?: string; message: string }> = (
      Array.isArray(body?.validation_status) ? body.validation_status : []
    )
      .filter((h: any) => Array.isArray(h?.errors) && h.errors.length)
      .map((h: any) => ({
        retailer_id: h.retailer_id,
        message: h.errors[0]?.message || "rejected by Meta",
      }));

    const handles: string[] = Array.isArray(body?.handles) ? body.handles : [];

    // A 200 with neither handles nor rejections means Meta accepted nothing and
    // told us nothing. Do not report that as success — it would stamp a whole
    // batch as synced on the strength of an empty body.
    if (!handles.length && !rejected.length) {
      return {
        ok: false,
        pushed: 0,
        failed: requests.length,
        errors: [{ message: "Meta returned no batch handles — nothing was queued" }],
        handles: [],
      };
    }

    return {
      ok: rejected.length === 0,
      pushed: requests.length - rejected.length,
      failed: rejected.length,
      errors: rejected,
      handles,
    };
  } catch (err) {
    return {
      ok: false,
      pushed: 0,
      failed: requests.length,
      errors: [{ message: `network: ${(err as Error).message}` }],
      handles: [],
    };
  }
}

/**
 * States that mean Meta has stopped working on a batch.
 *
 * Observed live: "started" (running) then "finished" (done). The rest are
 * defensive — Meta does not publish the full set, and being wrong in the
 * unlisted direction only costs a retry.
 */
const TERMINAL_BATCH_STATUSES = new Set([
  "finished",
  "complete",
  "completed",
  "error",
  "errored",
  "failed",
  "fatal",
]);

export interface BatchOutcome {
  /** Every handle reached a terminal state within the budget. */
  settled: boolean;
  errorCount: number;
  errors: Array<{ retailer_id?: string; message: string }>;
}

/**
 * Wait for queued batches to actually land. This is the only thing that can say
 * a sync worked.
 *
 * Meta's shape, measured:
 *   GET {catalog}/check_batch_request_status?handle=<h>&fields=status,errors,errors_total_count
 *   -> { data: [ { status: "finished", errors_total_count: 0, errors: [] } ] }
 *
 * Note `handle` is SINGULAR. Passing the plural `handles` fails with
 * "(#100) The parameter handle is required", which reads like the opposite of
 * what it means.
 *
 * Returns settled:false on timeout rather than guessing. A caller that cannot
 * confirm must leave those rows unstamped so the next run retries them —
 * claiming a sync that never landed is the failure this function exists to
 * prevent.
 */
export async function awaitBatchHandles(
  catalogId: string,
  accessToken: string,
  handles: string[],
  opts: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<BatchOutcome> {
  if (!handles.length) return { settled: true, errorCount: 0, errors: [] };

  const timeoutMs = opts.timeoutMs ?? 120_000;
  const intervalMs = opts.intervalMs ?? 3_000;
  const deadline = Date.now() + timeoutMs;

  const pending = new Set(handles);
  const errors: Array<{ retailer_id?: string; message: string }> = [];
  let errorCount = 0;

  while (pending.size && Date.now() < deadline) {
    for (const handle of [...pending]) {
      try {
        const url =
          `https://graph.facebook.com/${GRAPH_VERSION}/${catalogId}/check_batch_request_status` +
          `?handle=${encodeURIComponent(handle)}&fields=status,errors,errors_total_count`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(30_000),
        });
        const body = await res.json().catch(() => ({} as any));
        const row = body?.data?.[0];
        if (!row) continue;

        // Only KNOWN-terminal states end the wait. Listing the running states
        // instead is how this went wrong the first time: the check was "not
        // in_progress and not not_started", and Meta answered "started" — a
        // running job that scored as finished and would have been stamped as
        // synced. An unmodelled status must cost us a retry, never a false
        // success, so anything unrecognised keeps polling until the deadline.
        if (!TERMINAL_BATCH_STATUSES.has(String(row.status || "").toLowerCase())) continue;

        pending.delete(handle);
        errorCount += Number(row.errors_total_count || 0);
        for (const e of Array.isArray(row.errors) ? row.errors : []) {
          errors.push({
            retailer_id: e?.retailer_id || e?.id,
            message: e?.message || e?.description || "rejected by Meta",
          });
        }
      } catch {
        // Transient — leave it pending and retry on the next tick.
      }
    }
    if (pending.size) await new Promise((r) => setTimeout(r, intervalMs));
  }

  return { settled: pending.size === 0, errorCount, errors };
}
