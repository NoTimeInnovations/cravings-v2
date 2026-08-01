"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import {
  planCatalogSync,
  chunk,
  pushCatalogBatch,
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
  pushed: number;
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
    failed: 0,
    skipped,
    errors: [],
  };

  const now = new Date().toISOString();
  const rejected = new Set<string>();

  for (const batch of chunk(requests)) {
    const res = await pushCatalogBatch(partner.wa_catalog_id, cfg.token, batch);
    summary.pushed += res.pushed;
    summary.failed += res.failed;
    summary.errors.push(...res.errors);
    res.errors.forEach((e) => e.retailer_id && rejected.add(e.retailer_id));

    // A whole-batch failure (auth, network) has no per-item detail, so nothing
    // in it may be stamped as synced — otherwise the next run skips rows that
    // never reached Meta.
    if (!res.ok && !res.errors.some((e) => e.retailer_id)) {
      batch.forEach((r) => rejected.add(r.retailer_id));
    }
  }

  // Stamp only what actually landed.
  const landed = requests
    .filter((r) => r.method === "UPDATE" && !rejected.has(r.retailer_id))
    .map((r) => r.retailer_id);
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
