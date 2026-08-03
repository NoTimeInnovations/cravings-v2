/**
 * Outbound WhatsApp product messages — putting catalogue items INTO a chat.
 *
 * The counterpart to whatsappCatalogOrder.ts: that reads a cart the customer
 * sent, this shows them the dishes in the first place. Together they close the
 * loop — partner publishes menu, customer browses in-thread, carts, and gets a
 * checkout link back.
 *
 * Two shapes, both `interactive`:
 *   product       — one dish, with its photo and price
 *   product_list  — a browsable list, grouped into sections
 *
 * Nothing here prices anything. The catalogue holds the price WhatsApp renders;
 * the bill is still computed at checkout against the live menu, so a stale
 * catalogue shows a stale listing and never a wrong charge.
 */

/** Meta's ceiling for a product_list: 30 items total across at most 10 sections.
 *  Exceeding either is a 400, so the caller must be trimmed rather than trust
 *  the API to cope. */
export const MAX_PRODUCT_LIST_ITEMS = 30;
export const MAX_PRODUCT_LIST_SECTIONS = 10;

/** Body text is required and capped by Meta at 1024. */
const MAX_BODY = 1024;
/** Header/section titles are capped at 60; over-length is a 400, not a truncation. */
const MAX_TITLE = 60;

export interface ProductSection {
  title: string;
  retailerIds: string[];
}

function clip(s: string, n: number): string {
  const t = (s || "").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

/**
 * One dish in the chat, rendered with its catalogue photo and price and an
 * "Add to cart" affordance.
 */
export function buildSingleProductMessage(opts: {
  to: string;
  catalogId: string;
  retailerId: string;
  body: string;
  footer?: string | null;
}): Record<string, unknown> | null {
  if (!opts.to || !opts.catalogId || !opts.retailerId) return null;
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: opts.to,
    type: "interactive",
    interactive: {
      type: "product",
      body: { text: clip(opts.body, MAX_BODY) },
      ...(opts.footer ? { footer: { text: clip(opts.footer, 60) } } : {}),
      action: {
        catalog_id: opts.catalogId,
        product_retailer_id: opts.retailerId,
      },
    },
  };
}

/**
 * A browsable list of dishes, grouped into sections (we use menu categories).
 *
 * Returns null rather than a malformed message when there is nothing to show —
 * an empty product_list is a 400, and a caller that ignores that would look
 * like "the send silently did nothing".
 */
export function buildProductListMessage(opts: {
  to: string;
  catalogId: string;
  headerText: string;
  body: string;
  footer?: string | null;
  sections: ProductSection[];
}): Record<string, unknown> | null {
  if (!opts.to || !opts.catalogId) return null;

  // Trim to Meta's limits deterministically: whole sections first, then items,
  // so a section never renders with a confusing partial subset ahead of a
  // section that was dropped entirely.
  const sections: Array<{ title: string; product_items: Array<{ product_retailer_id: string }> }> = [];
  let budget = MAX_PRODUCT_LIST_ITEMS;
  for (const s of opts.sections) {
    if (sections.length >= MAX_PRODUCT_LIST_SECTIONS || budget <= 0) break;
    const ids = (s.retailerIds || []).filter(Boolean).slice(0, budget);
    if (!ids.length) continue;
    sections.push({
      // A section with no title is rejected; fall back rather than 400.
      title: clip(s.title || "Menu", MAX_TITLE),
      product_items: ids.map((id) => ({ product_retailer_id: id })),
    });
    budget -= ids.length;
  }
  if (!sections.length) return null;

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: opts.to,
    type: "interactive",
    interactive: {
      type: "product_list",
      header: { type: "text", text: clip(opts.headerText || "Our menu", MAX_TITLE) },
      body: { text: clip(opts.body, MAX_BODY) },
      ...(opts.footer ? { footer: { text: clip(opts.footer, 60) } } : {}),
      action: {
        catalog_id: opts.catalogId,
        sections,
      },
    },
  };
}

/**
 * The whole catalogue behind one "View catalog" button.
 *
 * Different from product_list in the way that matters here: product_list can
 * only carry 30 items, so a 124-dish menu arrives amputated. A catalog_message
 * shows a thumbnail and opens the FULL catalogue in WhatsApp's own browser —
 * every dish, no cap, and the customer builds their basket in there.
 *
 * `thumbnail_product_retailer_id` is required and must be a product Meta
 * actually holds; a stale id renders a blank card. Pass a currently-synced item.
 */
export function buildCatalogMessage(opts: {
  to: string;
  thumbnailRetailerId: string;
  body: string;
  footer?: string | null;
}): Record<string, unknown> | null {
  if (!opts.to || !opts.thumbnailRetailerId) return null;
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: opts.to,
    type: "interactive",
    interactive: {
      type: "catalog_message",
      body: { text: clip(opts.body, MAX_BODY) },
      ...(opts.footer ? { footer: { text: clip(opts.footer, 60) } } : {}),
      action: {
        name: "catalog_message",
        parameters: { thumbnail_product_retailer_id: opts.thumbnailRetailerId },
      },
    },
  };
}

/** How many items a product_list will actually carry after trimming — so the
 *  caller can tell the partner "showing 30 of 124" instead of quietly dropping
 *  most of the menu. */
export function countListedItems(sections: ProductSection[]): number {
  let budget = MAX_PRODUCT_LIST_ITEMS;
  let used = 0;
  let n = 0;
  for (const s of sections) {
    if (n >= MAX_PRODUCT_LIST_SECTIONS || budget <= 0) break;
    const take = Math.min((s.retailerIds || []).filter(Boolean).length, budget);
    if (!take) continue;
    n++;
    used += take;
    budget -= take;
  }
  return used;
}
