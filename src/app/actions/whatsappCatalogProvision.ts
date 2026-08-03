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
    # Live items, PLUS anything we have already published that has since been
    # soft-deleted. Filtering on deletion_status _eq 0 alone made the "deleted"
    # DELETE branch in planCatalogSync unreachable: a dish removed from the Menu
    # screen simply vanished from this query, was never planned, and stayed on
    # sale in WhatsApp forever. Bounded — only rows we actually pushed come back.
    menu(
      where: {
        partner_id: { _eq: $id }
        _or: [
          { deletion_status: { _eq: 0 } }
          { wa_catalog_synced_at: { _is_null: false } }
        ]
      }
    ) {
      id
      name
      description
      price
      delivery_price
      image_url
      is_available
      deletion_status
      wa_catalog_excluded
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
  description: string | null;
  imageUrl: string | null;
  /** Partner took this off WhatsApp deliberately. Kept apart from `reason` in
   *  the UI: it is a choice, not a problem to fix. */
  excluded: boolean;
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
  /** Genuine problems only — excluded dishes are counted separately so a
   *  deliberate removal never shows up as "needs attention". */
  ineligibleCount: number;
  excludedCount: number;
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

  const items: Array<
    CatalogMenuItem & { wa_catalog_synced_at?: string | null }
  > = data?.menu ?? [];

  // The query above deliberately includes soft-deleted rows so the SYNC can
  // remove them from Meta. They must not appear in the partner's list — the
  // dish is gone from their menu and showing it would look like a bug.
  const rows: CatalogItemStatus[] = items
    .filter((item) => (item.deletion_status ?? 0) === 0)
    .map((item) => {
    const built = buildCatalogProduct(item, partner);
    const reason = built.ok ? null : built.reason;
    const excluded = !!item.wa_catalog_excluded;
    return {
      id: item.id,
      name: item.name || "(unnamed)",
      description: item.description || null,
      imageUrl: item.image_url || null,
      excluded,
      // An excluded dish reports reason "excluded" from buildCatalogProduct.
      // Null it out so the UI's "problem" styling keys only on real problems.
      reason: excluded ? null : reason,
      reasonText: excluded ? "" : reason ? SKIP_REASON_TEXT[reason] : "",
      syncedAt: item.wa_catalog_synced_at ?? null,
    };
  });

  // Problems first — the list exists to be acted on, and a partner with 200
  // dishes should not have to scroll for the 12 that need a photo.
  // Problems first, then excluded, then the healthy ones — the list exists to
  // be acted on.
  const rank = (r: CatalogItemStatus) => (r.reason ? 0 : r.excluded ? 1 : 2);
  rows.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));

  const eligibleCount = rows.filter((r) => !r.reason && !r.excluded).length;
  const excludedCount = rows.filter((r) => r.excluded).length;
  return {
    ok: true,
    status: {
      enabled: hasCatalogFlag(partner.feature_flags),
      catalogId: partner.wa_catalog_id ?? null,
      total: rows.length,
      eligibleCount,
      excludedCount,
      ineligibleCount: rows.filter((r) => !!r.reason).length,
      syncedCount: rows.filter((r) => !r.reason && !r.excluded && r.syncedAt).length,
      items: rows,
    },
  };
}

const PARTNER_NUMBERS = `
  query CatalogPartnerNumbers($id: uuid!) {
    whatsapp_business_integrations(where: { partner_id: { _eq: $id } }) {
      phone_number_id
      display_phone
      access_token
    }
  }
`;

/** Everyone else on the same numbers. Commerce settings belong to the PHONE
 *  NUMBER, so this is the only way to know whether writing them is a
 *  single-tenant action. */
const NUMBER_TENANTS = `
  query CatalogNumberTenants($ids: [String!]!) {
    whatsapp_business_integrations(where: { phone_number_id: { _in: $ids } }) {
      phone_number_id
      partner_id
    }
  }
`;

export interface CommerceResult {
  phoneNumberId: string;
  displayPhone: string | null;
  ok: boolean;
  message?: string;
}

/**
 * Turn on the basket + catalogue button for a partner's WhatsApp number(s).
 *
 * Measured: this does NOT default on. Sampling numbers nobody had touched
 * returned `is_cart_enabled: false` on one and unset (null) on the rest — so
 * without this call a connected catalogue is invisible or un-cartable, and the
 * whole feature silently does nothing.
 *
 * Uses the PARTNER's own token, not our system user: the system user has no
 * role on a partner's WABA (100/subcode 33 on every call). Verified working
 * with the partner token on oreodemo.
 *
 * Applied to EVERY connected number, not just the primary. Commerce settings
 * are per phone number while the catalogue is linked per WABA, so a partner
 * with two numbers would otherwise get a basket on one and nothing on the
 * other, depending on which number the customer happened to message.
 *
 * Best-effort by design: a partner whose token has gone stale must not fail the
 * whole sync — the products are already in the catalogue and the next run
 * retries. Per-number outcomes come back so the admin can show what happened.
 */
export async function enableCatalogCommerce(
  partnerId: string,
): Promise<{ ok: boolean; message?: string; results: CommerceResult[] }> {
  if (!partnerId) return { ok: false, message: "partnerId required", results: [] };

  let rows: Array<{ phone_number_id: string; display_phone: string | null; access_token: string }>;
  try {
    const d = await fetchFromHasura(PARTNER_NUMBERS, { id: partnerId });
    rows = d?.whatsapp_business_integrations ?? [];
  } catch (err) {
    return { ok: false, message: `hasura: ${(err as Error).message}`, results: [] };
  }

  // Dedupe: a partner can hold several rows for one number.
  const byNumber = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (r.phone_number_id && r.access_token) byNumber.set(r.phone_number_id, r);
  }
  if (!byNumber.size) {
    return { ok: false, message: "no connected WhatsApp number for this partner", results: [] };
  }

  // ── Cross-tenant guard ──────────────────────────────────────────────────
  //
  // whatsapp_commerce_settings belongs to the PHONE NUMBER, not to the partner.
  // Production has one number (870675129470312) shared by 32 DISTINCT partners
  // — and not outlets of one brand: a paint shop, a steel merchant, a gas-spares
  // shop, a minimart, several unrelated restaurants. Writing here on behalf of
  // one of them would switch the catalogue button and basket on in the chats of
  // 31 businesses that never asked for it, cannot see it in their dashboard and
  // cannot turn it off.
  //
  // getFeatures.ts already documents this as a design constraint —
  // "unavailable to the outlets that share a number" — but it was enforced
  // nowhere in code, which is exactly how the Televery attribution bug happened
  // earlier: an invariant that lives only in a comment is not an invariant.
  let tenantsByNumber = new Map<string, Set<string>>();
  try {
    const t = await fetchFromHasura(NUMBER_TENANTS, { ids: [...byNumber.keys()] });
    for (const row of t?.whatsapp_business_integrations ?? []) {
      const set = tenantsByNumber.get(row.phone_number_id) ?? new Set<string>();
      set.add(row.partner_id);
      tenantsByNumber.set(row.phone_number_id, set);
    }
  } catch (err) {
    // Cannot prove single tenancy → do not write. Failing closed costs this
    // partner a manual toggle; failing open changes other merchants' chats.
    return {
      ok: false,
      message: `could not verify number ownership, refusing to change shared settings: ${(err as Error).message}`,
      results: [],
    };
  }

  const shared: CommerceResult[] = [];
  for (const [pn, r] of [...byNumber]) {
    const tenants = tenantsByNumber.get(pn);
    // An empty/absent set means the read returned nothing for a number we know
    // exists — treat as unproven and skip, same reasoning as the catch above.
    if (!tenants || tenants.size !== 1) {
      byNumber.delete(pn);
      shared.push({
        phoneNumberId: pn,
        displayPhone: r.display_phone,
        ok: false,
        message: `shared with ${Math.max((tenants?.size ?? 1) - 1, 1)} other business(es) — the basket is a per-number setting, so it must be switched on manually in WhatsApp Manager`,
      });
    }
  }

  if (!byNumber.size) {
    return {
      ok: false,
      message: "every connected number is shared with other businesses",
      results: shared,
    };
  }

  const results: CommerceResult[] = await Promise.all(
    [...byNumber.values()].map(async (r) => {
      try {
        const res = await fetch(
          `https://graph.facebook.com/${GRAPH_VERSION}/${r.phone_number_id}/whatsapp_commerce_settings` +
            `?is_cart_enabled=true&is_catalog_visible=true`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${r.access_token}` },
            signal: AbortSignal.timeout(30_000),
          },
        );
        const body = await res.json().catch(() => ({} as any));
        if (!res.ok || body?.success === false) {
          return {
            phoneNumberId: r.phone_number_id,
            displayPhone: r.display_phone,
            ok: false,
            message:
              body?.error?.error_user_msg || body?.error?.message || `HTTP ${res.status}`,
          };
        }
        return { phoneNumberId: r.phone_number_id, displayPhone: r.display_phone, ok: true };
      } catch (err) {
        return {
          phoneNumberId: r.phone_number_id,
          displayPhone: r.display_phone,
          ok: false,
          message: `network: ${(err as Error).message}`,
        };
      }
    }),
  );

  const all = [...results, ...shared];
  return { ok: all.every((r) => r.ok), results: all };
}

/** Provision if needed, sync the menu, then switch the basket on. */
export async function provisionAndSyncCatalog(partnerId: string) {
  const prov = await provisionPartnerCatalog(partnerId);
  if (!prov.ok) return { ok: false, message: prov.message };
  const sync = await syncPartnerCatalog(partnerId);

  // Cart + catalogue visibility. Runs even when the sync did not settle: it is
  // an independent per-number setting, the products are already queued, and a
  // partner who has to click Sync twice should not also have to wait for the
  // basket. Never allowed to fail the sync — the catalogue is the hard part and
  // it is already done by here.
  const commerce = await enableCatalogCommerce(partnerId).catch((err) => ({
    ok: false,
    message: `commerce settings: ${(err as Error).message}`,
    results: [] as CommerceResult[],
  }));

  return {
    ok: sync.ok,
    message: sync.message,
    catalogId: (prov.data as any)?.catalogId,
    created: (prov.data as any)?.created,
    summary: sync.summary,
    /** Basket/visibility per number. ok:false here does NOT mean the sync failed. */
    commerce,
  };
}
