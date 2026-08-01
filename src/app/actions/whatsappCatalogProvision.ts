"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  planCatalogSync,
  chunk,
  pushCatalogBatch,
  awaitBatchHandles,
  buildCatalogProduct,
  SKIP_REASON_TEXT,
  type CatalogMenuItem,
  type CatalogPartner,
  type SkipReason,
} from "@/lib/whatsappCatalog";

/**
 * Provision + sync a partner's WhatsApp Business Catalogue.
 *
 * ── Why the catalogue lives under OUR portfolio ───────────────────────────────
 *
 * Embedded Signup issues a WhatsApp-scoped SYSTEM_USER token — verified on a
 * freshly reconnected partner: scopes are whatsapp_business_management,
 * whatsapp_business_messaging, whatsapp_business_manage_events, public_profile,
 * and nothing else. `catalog_management` is not in that set and adding the
 * Catalog API use case to the app does not change it, because the use case
 * governs what the APP may request while Embedded Signup governs what THIS token
 * carries. So a partner token can never manage a catalogue.
 *
 * The catalogue is therefore created under Menuthere's own Business Portfolio,
 * with our own system user granted catalog_management — which we can do
 * ourselves, no App Review, because it is our business.
 *
 * ⚠ The consequence, stated plainly because it is a business decision and not a
 * technical one: WE own the partner's product catalogue. If a partner leaves,
 * their catalogue is an asset on our portfolio, not theirs, and offboarding has
 * to delete it explicitly or it lingers holding their menu.
 *
 * ── One catalogue per partner, never a shared one ─────────────────────────────
 *
 * retailer_id is our menu uuid, so a single shared catalogue would not COLLIDE —
 * but WhatsApp shows a connected catalogue in full, so one restaurant's customers
 * would browse every other restaurant's dishes. The isolation is the point.
 */

const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

type Result =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; message: string };

/** Our own portfolio + a system user on it holding catalog_management. Absent in
 *  every environment until someone creates them in Business Manager, so every
 *  entry point fails loudly rather than half-provisioning. */
function catalogConfig(): { businessId: string; token: string } | null {
  const businessId = process.env.META_BUSINESS_ID;
  const token = process.env.META_CATALOG_SYSTEM_TOKEN;
  if (!businessId || !token) return null;
  return { businessId, token };
}

const PARTNER_QUERY = `
  query CatalogPartner($id: uuid!) {
    partners_by_pk(id: $id) {
      id
      username
      store_name
      currency
      feature_flags
      wa_catalog_id
    }
    menu(where: { partner_id: { _eq: $id }, deletion_status: { _eq: 0 } }) {
      id
      name
      description
      price
      delivery_price
      image_url
      is_available
      deletion_status
      wa_catalog_synced_at
      stocks { stock_quantity show_stock }
    }
  }
`;

const SAVE_CATALOG_ID = `
  mutation SaveWaCatalogId($id: uuid!, $catalogId: String!) {
    update_partners_by_pk(pk_columns: { id: $id }, _set: { wa_catalog_id: $catalogId }) {
      id
      wa_catalog_id
    }
  }
`;

/** Per-item sync state. Written in one mutation per outcome rather than per row —
 *  a 300-item menu must not become 300 round trips. */
const MARK_SYNCED = `
  mutation MarkSynced($ids: [uuid!]!, $at: timestamptz!) {
    update_menu(
      where: { id: { _in: $ids } }
      _set: { wa_catalog_synced_at: $at, wa_catalog_error: null }
    ) { affected_rows }
  }
`;

const MARK_SKIPPED = `
  mutation MarkSkipped($ids: [uuid!]!, $reason: String!) {
    update_menu(
      where: { id: { _in: $ids } }
      _set: { wa_catalog_error: $reason, wa_catalog_synced_at: null }
    ) { affected_rows }
  }
`;

function hasCatalogFlag(featureFlags: string | null | undefined): boolean {
  return String(featureFlags || "").includes("whatsappcatalog-true");
}

/**
 * Create the catalogue for a partner under our portfolio and remember its id.
 *
 * Idempotent: a partner that already has wa_catalog_id keeps it. Creating a
 * second catalogue would orphan the first with a full copy of their menu still
 * in it and no record that it exists.
 */
export async function provisionPartnerCatalog(partnerId: string): Promise<Result> {
  const cfg = catalogConfig();
  if (!cfg) {
    return {
      ok: false,
      message:
        "META_BUSINESS_ID / META_CATALOG_SYSTEM_TOKEN not configured — create a system user with catalog_management on the Menuthere portfolio first.",
    };
  }
  if (!partnerId) return { ok: false, message: "partnerId required" };

  let data: any;
  try {
    data = await fetchFromHasura(PARTNER_QUERY, { id: partnerId });
  } catch (err) {
    return { ok: false, message: `hasura: ${(err as Error).message}` };
  }

  const partner = data?.partners_by_pk;
  if (!partner) return { ok: false, message: "partner not found" };
  if (!hasCatalogFlag(partner.feature_flags)) {
    return { ok: false, message: "whatsappcatalog is not enabled for this partner" };
  }
  if (partner.wa_catalog_id) {
    return { ok: true, data: { catalogId: partner.wa_catalog_id, created: false } };
  }

  // Name it so a human scanning our portfolio can tell whose menu this is. The
  // username is included because store names repeat across partners.
  const name = `${partner.store_name || partner.username || "Partner"} (${partner.username || partnerId.slice(0, 8)})`;

  let catalogId: string;
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${cfg.businessId}/owned_product_catalogs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.token}`,
        },
        body: JSON.stringify({ name, vertical: "commerce" }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    const body = await res.json().catch(() => ({} as any));
    if (!res.ok || !body?.id) {
      return {
        ok: false,
        message:
          body?.error?.error_user_msg ||
          body?.error?.message ||
          `catalog create failed (HTTP ${res.status})`,
      };
    }
    catalogId = body.id;
  } catch (err) {
    return { ok: false, message: `network: ${(err as Error).message}` };
  }

  // Persist BEFORE anything else can fail. A catalogue that exists on Meta but
  // is not recorded here is invisible to us and would be created again on the
  // next attempt.
  try {
    await fetchFromHasura(SAVE_CATALOG_ID, { id: partnerId, catalogId });
  } catch (err) {
    return {
      ok: false,
      message: `catalogue ${catalogId} was created but could not be saved: ${(err as Error).message}`,
    };
  }

  return { ok: true, data: { catalogId, created: true } };
}

export interface SyncSummary {
  catalogId: string;
  total: number;
  /** Confirmed applied by Meta. Zero when a run did not settle — not a failure
   *  count, an "unknown" count; the rows stay pending for the next run. */
  pushed: number;
  /** False when Meta was still processing at the deadline, so nothing was
   *  marked synced. Callers must not present an unsettled run as complete. */
  settled: boolean;
  failed: number;
  skipped: Array<{ id: string; reason: SkipReason }>;
  errors: Array<{ retailer_id?: string; message: string }>;
}

/**
 * Push the partner's live menu into their catalogue.
 *
 * Safe to run repeatedly — every write is an upsert keyed on our menu uuid, so a
 * re-run reconciles rather than duplicating.
 */
export async function syncPartnerCatalog(
  partnerId: string,
): Promise<{ ok: boolean; message?: string; summary?: SyncSummary }> {
  const cfg = catalogConfig();
  if (!cfg) {
    return { ok: false, message: "META_BUSINESS_ID / META_CATALOG_SYSTEM_TOKEN not configured" };
  }

  let data: any;
  try {
    data = await fetchFromHasura(PARTNER_QUERY, { id: partnerId });
  } catch (err) {
    return { ok: false, message: `hasura: ${(err as Error).message}` };
  }

  const partner = data?.partners_by_pk as (CatalogPartner & { feature_flags?: string }) | null;
  if (!partner) return { ok: false, message: "partner not found" };
  if (!hasCatalogFlag(partner.feature_flags)) {
    return { ok: false, message: "whatsappcatalog is not enabled for this partner" };
  }
  if (!partner.wa_catalog_id) {
    return { ok: false, message: "no catalogue provisioned for this partner yet" };
  }

  const items: CatalogMenuItem[] = data?.menu ?? [];
  const { requests, skipped } = planCatalogSync(items, partner);

  const summary: SyncSummary = {
    catalogId: partner.wa_catalog_id,
    total: items.length,
    pushed: 0,
    settled: false,
    failed: 0,
    skipped,
    errors: [],
  };

  const now = new Date().toISOString();
  const rejected = new Set<string>();
  const handles: string[] = [];

  for (const batch of chunk(requests)) {
    const res = await pushCatalogBatch(partner.wa_catalog_id, cfg.token, batch);
    summary.failed += res.failed;
    summary.errors.push(...res.errors);
    res.errors.forEach((e) => e.retailer_id && rejected.add(e.retailer_id));
    handles.push(...res.handles);

    // A whole-batch failure (auth, network, nothing queued) has no per-item
    // detail, so nothing in it may be stamped as synced — otherwise the next
    // run skips rows that never reached Meta.
    if (!res.ok && !res.errors.some((e) => e.retailer_id)) {
      batch.forEach((r) => rejected.add(r.retailer_id));
    }
  }

  // /batch is asynchronous: everything above is QUEUED, not applied. Nothing may
  // be called synced until Meta says the job finished. If it does not settle in
  // time we deliberately stamp nothing — the rows stay pending and the next run
  // retries them, which is recoverable. Claiming a sync that silently dropped a
  // menu is not.
  const outcome = await awaitBatchHandles(partner.wa_catalog_id, cfg.token, handles);
  summary.settled = outcome.settled;
  summary.errors.push(...outcome.errors);
  outcome.errors.forEach((e) => e.retailer_id && rejected.add(e.retailer_id));

  if (!outcome.settled) {
    summary.errors.push({
      message:
        "Meta did not finish processing in time — nothing marked synced; re-run to confirm.",
    });
  }

  // Errors Meta counted but did not itemise still have to reduce the success
  // count, or a partly-rejected batch reads as a clean sweep.
  summary.failed += Math.max(0, outcome.errorCount - outcome.errors.length);

  // Stamp only what actually landed — and only if Meta confirmed the job.
  const landed = outcome.settled
    ? requests
        .filter((r) => r.method === "UPDATE" && !rejected.has(r.retailer_id))
        .map((r) => r.retailer_id)
    : [];
  summary.pushed = landed.length;
  if (landed.length) {
    try {
      await fetchFromHasura(MARK_SYNCED, { ids: landed, at: now });
    } catch (err) {
      console.error("[wa-catalog] mark synced failed:", err);
    }
  }

  // Record why each absent item is absent, so the admin can show a cause rather
  // than a silent gap.
  const byReason = new Map<SkipReason, string[]>();
  skipped.forEach((s) => {
    const arr = byReason.get(s.reason) || [];
    arr.push(s.id);
    byReason.set(s.reason, arr);
  });
  for (const [reason, ids] of byReason) {
    try {
      await fetchFromHasura(MARK_SKIPPED, { ids, reason });
    } catch (err) {
      console.error("[wa-catalog] mark skipped failed:", err);
    }
  }

  return { ok: summary.failed === 0, summary };
}

export interface CatalogItemStatus {
  id: string;
  name: string;
  imageUrl: string | null;
  /** null = eligible. */
  reason: SkipReason | null;
  /** What the partner should DO about it. Empty for eligible rows. */
  reasonText: string;
  syncedAt: string | null;
}

export interface CatalogStatus {
  enabled: boolean;
  catalogId: string | null;
  total: number;
  eligibleCount: number;
  ineligibleCount: number;
  syncedCount: number;
  items: CatalogItemStatus[];
}

/**
 * Read-only eligibility breakdown for the admin card: which dishes can go to
 * WhatsApp, which cannot, and why.
 *
 * Runs the SAME buildCatalogProduct the sync uses, so the reason shown is the
 * reason the sync will act on — a second implementation here would drift and
 * start lying about what is about to happen.
 */
export async function getCatalogSyncStatus(
  partnerId: string,
): Promise<{ ok: true; status: CatalogStatus } | { ok: false; message: string }> {
  if (!partnerId) return { ok: false, message: "partnerId required" };

  let data: any;
  try {
    data = await fetchFromHasura(PARTNER_QUERY, { id: partnerId });
  } catch (err) {
    return { ok: false, message: `hasura: ${(err as Error).message}` };
  }

  const partner = data?.partners_by_pk as (CatalogPartner & { feature_flags?: string }) | null;
  if (!partner) return { ok: false, message: "partner not found" };

  const items: Array<CatalogMenuItem & { wa_catalog_synced_at?: string | null }> = data?.menu ?? [];

  const rows: CatalogItemStatus[] = items.map((item) => {
    const built = buildCatalogProduct(item, partner);
    const reason = built.ok ? null : built.reason;
    return {
      id: item.id,
      name: item.name || "(unnamed)",
      imageUrl: item.image_url || null,
      reason,
      reasonText: reason ? SKIP_REASON_TEXT[reason] : "",
      syncedAt: item.wa_catalog_synced_at ?? null,
    };
  });

  // Problems first — the list exists to be acted on, and a partner with 200
  // dishes should not have to scroll for the 12 that need a photo.
  rows.sort((a, b) => {
    if (!!a.reason !== !!b.reason) return a.reason ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const eligibleCount = rows.filter((r) => !r.reason).length;
  return {
    ok: true,
    status: {
      enabled: hasCatalogFlag(partner.feature_flags),
      catalogId: partner.wa_catalog_id ?? null,
      total: rows.length,
      eligibleCount,
      ineligibleCount: rows.length - eligibleCount,
      syncedCount: rows.filter((r) => !r.reason && r.syncedAt).length,
      items: rows,
    },
  };
}

/** Provision if needed, then sync. The one call a superadmin action needs. */
export async function provisionAndSyncCatalog(partnerId: string) {
  const prov = await provisionPartnerCatalog(partnerId);
  if (!prov.ok) return { ok: false, message: prov.message };
  const sync = await syncPartnerCatalog(partnerId);
  return {
    ok: sync.ok,
    message: sync.message,
    catalogId: (prov.data as any)?.catalogId,
    created: (prov.data as any)?.created,
    summary: sync.summary,
  };
}
