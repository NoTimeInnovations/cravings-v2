"use server";

import { fetchFromHasura } from "@/lib/hasuraClient";
import { revalidateTag } from "@/app/actions/revalidate";
import {
  buildCatalogProduct,
  pushCatalogBatch,
  awaitBatchHandles,
  type CatalogMenuItem,
  type CatalogPartner,
} from "@/lib/whatsappCatalog";

/**
 * Per-dish catalogue management.
 *
 * ── The menu is the single source of truth ────────────────────────────────────
 *
 * Editing a dish here writes to the MENU row, then pushes it. There is no
 * WhatsApp-only copy of a name or photo, deliberately: the sync is a full
 * reconcile that re-pushes every field from `menu` on every run, so a
 * catalogue-only edit would be silently reverted the next time anyone pressed
 * Sync. One source of truth is the only version of this that stays true.
 *
 * The consequence, stated plainly because it surprises people: renaming a dish
 * here renames it on the storefront, the QR menu and the POS too.
 *
 * ── Three different removals ──────────────────────────────────────────────────
 *
 *   remove   → off WhatsApp, stays on the menu, and STAYS off (wa_catalog_excluded)
 *   add back → clears the exclusion and pushes it again
 *   delete   → off WhatsApp AND off the menu (deletion_status = 1)
 *
 * "Remove" has to set a flag rather than just delete the Meta product, because
 * the next sync would otherwise re-add it and the partner's decision would last
 * until exactly the next menu edit.
 */

const ITEM_CONTEXT = `
  query CatalogItemContext($partnerId: uuid!, $itemId: uuid!) {
    partners_by_pk(id: $partnerId) {
      id
      username
      store_name
      currency
      feature_flags
      wa_catalog_id
    }
    menu_by_pk(id: $itemId) {
      id
      partner_id
      name
      description
      price
      delivery_price
      image_url
      is_available
      deletion_status
      wa_catalog_excluded
      stocks { stock_quantity show_stock }
    }
  }
`;

type Ctx = {
  partner: CatalogPartner & { feature_flags?: string };
  item: CatalogMenuItem & { partner_id: string };
};

function catalogConfig(): { businessId: string; token: string } | null {
  const businessId = process.env.META_BUSINESS_ID;
  const token = process.env.META_CATALOG_SYSTEM_TOKEN;
  if (!businessId || !token) return null;
  return { businessId, token };
}

/**
 * Load + authorise in one place.
 *
 * The ownership check is the important part: these actions take a menu id from
 * the client, so without it any signed-in partner could edit or delete another
 * restaurant's dish by passing its uuid.
 */
async function loadCtx(
  partnerId: string,
  itemId: string,
): Promise<{ ok: true; ctx: Ctx } | { ok: false; message: string }> {
  if (!partnerId || !itemId) return { ok: false, message: "partnerId and itemId are required" };
  let data: any;
  try {
    data = await fetchFromHasura(ITEM_CONTEXT, { partnerId, itemId });
  } catch (err) {
    return { ok: false, message: `hasura: ${(err as Error).message}` };
  }
  const partner = data?.partners_by_pk;
  const item = data?.menu_by_pk;
  if (!partner) return { ok: false, message: "partner not found" };
  if (!item) return { ok: false, message: "item not found" };
  if (item.partner_id !== partner.id) {
    return { ok: false, message: "that item does not belong to this store" };
  }
  if (!String(partner.feature_flags || "").includes("whatsappcatalog-true")) {
    return { ok: false, message: "WhatsApp Catalogue is not enabled for this store" };
  }
  return { ok: true, ctx: { partner, item } };
}

/**
 * Push (or remove) exactly one dish and wait for Meta to confirm.
 *
 * Single-item so a partner editing one name does not wait on a 300-dish batch,
 * and so the toast can say what actually happened to THAT dish. Waits for the
 * async batch to settle — reporting success on a queued job is the bug that
 * made "0 items sent" look like a clean sweep.
 */
async function pushOne(
  ctx: Ctx,
  mode: "upsert" | "remove",
): Promise<{ ok: boolean; message?: string; nothingToDo?: boolean }> {
  const cfg = catalogConfig();
  const catalogId = ctx.partner.wa_catalog_id;

  // No catalogue provisioned (or no Meta config here) means there is nothing on
  // Meta's side to change. For a REMOVE that is success, not failure —
  // treating it as failure blocked Delete entirely for any partner who had
  // never pressed Sync, including one whose dishes have no photos and who
  // therefore CANNOT press Sync (the button is disabled at 0 eligible).
  if (!cfg || !catalogId) {
    if (mode === "remove") return { ok: true, nothingToDo: true };
    return {
      ok: false,
      message: cfg
        ? "no catalogue yet — press Sync first"
        : "catalogue is not configured on this environment",
    };
  }

  let request;
  if (mode === "remove") {
    request = { method: "DELETE" as const, retailer_id: ctx.item.id };
  } else {
    const built = buildCatalogProduct(ctx.item, ctx.partner);
    if (!built.ok) {
      return { ok: false, message: `cannot be listed: ${built.reason.replace(/_/g, " ")}` };
    }
    const { retailer_id, ...data } = built.product;
    request = { method: "UPDATE" as const, retailer_id, data };
  }

  const res = await pushCatalogBatch(catalogId, cfg.token, [request]);
  if (!res.ok && res.errors.length) {
    return { ok: false, message: res.errors[0].message };
  }
  const outcome = await awaitBatchHandles(catalogId, cfg.token, res.handles, {
    timeoutMs: 60_000,
  });
  if (!outcome.settled) {
    return { ok: false, message: "WhatsApp is still processing this change — it may take a moment to appear." };
  }
  if (outcome.errorCount) {
    return { ok: false, message: outcome.errors[0]?.message || "WhatsApp rejected this item" };
  }
  return { ok: true };
}

const MARK_ITEM = `
  mutation MarkCatalogItem($id: uuid!, $set: menu_set_input!) {
    update_menu_by_pk(pk_columns: { id: $id }, _set: $set) { id }
  }
`;

/**
 * Edit a dish and republish it.
 *
 * Writes the MENU row — see the note at the top of this file — so the change is
 * live everywhere, then pushes just this product.
 */
export async function updateCatalogItem(
  partnerId: string,
  itemId: string,
  fields: { name?: string; description?: string; imageUrl?: string },
): Promise<{ ok: boolean; message?: string }> {
  const loaded = await loadCtx(partnerId, itemId);
  if (!loaded.ok) return loaded;
  const { ctx } = loaded;

  const set: Record<string, unknown> = {};
  if (typeof fields.name === "string") {
    const n = fields.name.trim();
    // A blank name would strip the dish from the catalogue AND leave it unnamed
    // on the storefront — refuse rather than accept a destructive no-op.
    if (!n) return { ok: false, message: "Name cannot be empty." };
    set.name = n;
  }
  if (typeof fields.description === "string") set.description = fields.description.trim();
  if (typeof fields.imageUrl === "string") {
    const u = fields.imageUrl.trim();
    if (u && !/^https?:\/\//i.test(u)) return { ok: false, message: "Image must be a URL." };
    set.image_url = u || null;
  }
  if (!Object.keys(set).length) return { ok: false, message: "Nothing to update." };

  try {
    await fetchFromHasura(MARK_ITEM, { id: itemId, set });
  } catch (err) {
    return { ok: false, message: `could not save: ${(err as Error).message}` };
  }
  // The dish changed on the storefront too, so the ISR cache has to go.
  try {
    await revalidateTag(partnerId);
  } catch {
    /* cache refresh is best-effort; the write already landed */
  }

  // Push with the NEW values, not the ones loaded before the write.
  const merged: Ctx = {
    partner: ctx.partner,
    item: {
      ...ctx.item,
      ...(set.name !== undefined ? { name: set.name as string } : {}),
      ...(set.description !== undefined ? { description: set.description as string } : {}),
      ...(set.image_url !== undefined ? { image_url: set.image_url as string | null } : {}),
    },
  };

  // An excluded dish is edited but NOT republished — pushing it would undo the
  // partner's decision to take it off WhatsApp.
  if (merged.item.wa_catalog_excluded) {
    return { ok: true, message: "Saved. This dish is still off WhatsApp." };
  }

  const pushed = await pushOne(merged, "upsert");
  if (!pushed.ok) {
    return { ok: true, message: `Saved, but WhatsApp wasn't updated: ${pushed.message}` };
  }
  const stamp = new Date().toISOString();
  try {
    await fetchFromHasura(MARK_ITEM, {
      id: itemId,
      set: { wa_catalog_synced_at: stamp, wa_catalog_error: null },
    });
  } catch {
    /* the product is live; the stamp is bookkeeping */
  }
  return { ok: true };
}

/**
 * Take a dish off WhatsApp (keeping it on the menu), or put it back.
 *
 * The flag is written BEFORE the Meta call: if the push fails, the next full
 * sync still honours the decision. The other order would leave a partner who
 * pressed Remove with the dish still on sale.
 */
export async function setCatalogItemExcluded(
  partnerId: string,
  itemId: string,
  excluded: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const loaded = await loadCtx(partnerId, itemId);
  if (!loaded.ok) return loaded;

  try {
    await fetchFromHasura(MARK_ITEM, {
      id: itemId,
      set: {
        wa_catalog_excluded: excluded,
        ...(excluded
          ? { wa_catalog_synced_at: null, wa_catalog_error: "excluded" }
          : { wa_catalog_error: null }),
      },
    });
  } catch (err) {
    return { ok: false, message: `could not save: ${(err as Error).message}` };
  }

  const ctx: Ctx = {
    ...loaded.ctx,
    item: { ...loaded.ctx.item, wa_catalog_excluded: excluded },
  };
  const pushed = await pushOne(ctx, excluded ? "remove" : "upsert");
  if (pushed.nothingToDo) {
    return { ok: true, message: "Saved. It isn't published to WhatsApp yet anyway." };
  }
  if (!pushed.ok) {
    return {
      ok: false,
      message: excluded
        ? `Marked as removed, but WhatsApp still has it: ${pushed.message}`
        : `Allowed back, but WhatsApp wasn't updated: ${pushed.message}`,
    };
  }
  if (!excluded) {
    try {
      await fetchFromHasura(MARK_ITEM, {
        id: itemId,
        set: { wa_catalog_synced_at: new Date().toISOString(), wa_catalog_error: null },
      });
    } catch {
      /* bookkeeping only */
    }
  }
  return { ok: true };
}

/**
 * Delete the dish outright — off WhatsApp AND off the menu.
 *
 * Soft delete (deletion_status = 1), matching how the rest of the dashboard
 * removes a dish, so it disappears from the storefront, QR menu and POS but the
 * row survives for order history to point at.
 *
 * The exclusion flag is set too. Without it, a dish restored from soft-delete
 * later would quietly reappear on WhatsApp.
 */
export async function deleteCatalogItem(
  partnerId: string,
  itemId: string,
): Promise<{ ok: boolean; message?: string }> {
  const loaded = await loadCtx(partnerId, itemId);
  if (!loaded.ok) return loaded;

  // Remove from Meta FIRST: if the menu row is gone and this fails, the dish is
  // still on sale in WhatsApp with nothing left in the UI to retry from.
  const pushed = await pushOne(loaded.ctx, "remove");
  if (!pushed.ok) {
    return { ok: false, message: `Could not remove it from WhatsApp: ${pushed.message}` };
  }

  try {
    await fetchFromHasura(MARK_ITEM, {
      id: itemId,
      set: {
        deletion_status: 1,
        wa_catalog_excluded: true,
        wa_catalog_synced_at: null,
        wa_catalog_error: null,
      },
    });
  } catch (err) {
    return { ok: false, message: `removed from WhatsApp, but the menu delete failed: ${(err as Error).message}` };
  }
  try {
    await revalidateTag(partnerId);
  } catch {
    /* best-effort */
  }
  return { ok: true };
}

/** Publish one dish now, without waiting for a full sync. */
export async function syncSingleCatalogItem(
  partnerId: string,
  itemId: string,
): Promise<{ ok: boolean; message?: string }> {
  const loaded = await loadCtx(partnerId, itemId);
  if (!loaded.ok) return loaded;
  if (loaded.ctx.item.wa_catalog_excluded) {
    return { ok: false, message: "This dish is removed from WhatsApp. Add it back first." };
  }
  const pushed = await pushOne(loaded.ctx, "upsert");
  if (!pushed.ok) return pushed;
  try {
    await fetchFromHasura(MARK_ITEM, {
      id: itemId,
      set: { wa_catalog_synced_at: new Date().toISOString(), wa_catalog_error: null },
    });
  } catch {
    /* bookkeeping only */
  }
  return { ok: true };
}
